const qs = require('qs')
const getProp = require('get-prop')
const JSONStream = require('JSONStream')
const blessed = require('blessed')
const contrib = require('blessed-contrib')
const {exec}= require('shelljs')
const meow = require('meow')
const path = require(`path`);

const cli = meow(`
    Usage
      $ wos <options>

    Important
      Use single quotes in order to escape special characters.

    Options
      -i, --interface Capture interface
      -s, --ssid Wifi SSID
      -p, --pass Wifi password
      -nm, --no-monitor Disable monitor mode

    Examples
      $ wos -i en0 --ssid='HomeWifi' --pass='d4Pazsw0rD'
`)

const {flags} = cli

const ssid = process.env.WOS_SSID || flags.ssid || flags.s
const pass = process.env.WOS_PASS || flags.pass || flags.p
const interface = process.env.WOS_INTERFACE || flags.interface || flags.i

let screen = null
let table = null
const tableHeaders = ['login', 'pass', 'port', 'host', 'dst_ip', 'ip', 'mac']
const tableData = []

const userFields = [
  'log', 'login', 'wpname', 'name', 'ahd_username', 'unickname', 'nickname', 'user', 'user_name', 'alias', 'pseudo', 'email', 'username', '_username', 'userid', 'form_loginname', 'loginname', 'login_id', 'loginid', 'session_key', 'sessionkey', 'pop_login', 'uid', 'id', 'user_id', 'screename', 'uname', 'ulogin', 'acct', 'acctname', 'account', 'member', 'mailaddress', 'membername', 'login_username', 'login_email', 'loginusername', 'loginemail', 'uin', 'sign-in', 'sign_in', 'identification', 'os_username', 'txtAccount', 'loginAccount', 'username', 'user_email', 'useremail', 'account_id', 'customer', 'customer_id', 'identifier', 'session[username_or_email]', 'user[email]', 'signin-form[login]', '_username', 'identity', 'sUsername', 'login[username]', 'onlineId', 'onlineId1', 'online_id', 'userId', 'j_username', 'userid', 'AccessIDVisible', 'accessId', 'accessid', 'access_id'
]

const passFields = [
  'os_password', 'txtPwd', 'loginPasswd', 'ahd_password', 'pass', 'password', '_password', 'passwd', 'passwrd', 'session_password', 'sessionpassword', 'login_password', 'loginpassword', 'form_pw', 'pw', 'userpassword', 'pwd', 'upassword', 'login_password', 'passwort', 'wppassword', 'upasswd', 'password', 'user_pass', 'secret', 'session[password]', 'user[password]', 'signin-form[password]', '_password', 'sPassword', 'login[password]', 'passcode', 'passcode1', 'j_password'
]

if (interface) {
  main()
} else {
  return false
}


function main() {
screen = blessed.screen()

table = contrib.table({
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: true,
  label: 'Wall of Sheep',
  width: '100%',
  height: '100%',
  border: {
    type: 'line',
    fg: 'cyan'
  },
  columnSpacing: 5,
  columnWidth: [20, 20, 20, 20, 20, 20, 20]
})

table.focus()

table.setData({
  headers: tableHeaders,
  data: tableData
})

screen.append(table)
screen.render()

const tshark = path.resolve(__dirname, './tshark.sh')
const child = exec(`source ${tshark} ${interface} ${ssid} ${pass}`, {async: true, silent: true})

  //process.stdin.pipe(JSONStream.parse('*._source.layers'))
  child.stdout.pipe(JSONStream.parse('*._source.layers'))
  .on('data', processLine)

}


function processLine (layers) {
  const get = getProp(layers)

  const srcmac = get(['eth', 'eth.src', 'eth.addr'])
  const srcmacResolved = get(['eth', 'eth.src', 'eth.addr_resolved'])
  const dstmac = get(['eth', 'eth.dst', 'eth.addr'])
  const distmacResolved = get(['eth', 'eth.dst', 'eth.addr_resolved'])

  const port = get(['tcp', 'tcp.port'])
  const srcport = get(['tcp', 'tcp.srcport'])
  const dstport = get(['tcp', 'tcp.dstport'])

  const srcip = get(['ip', 'ip.src'])
  const dstip = get(['ip', 'ip.dst'])

  const firstKey = Object.keys(get(['http'], {}))[0]

  const method = get(['http', firstKey, 'http.request.method'])
  const userAgent = get(['http', 'http.user_agent'])
  const host = get(['http', 'http.host'])
  const requestUri = get(['http', 'http.request.full_uri'])
  const cookie = get(['http', 'http.cookie'])
  const contentType = get(['http', 'http.content_type'])
  const httpData = get(['http', 'http.file_data'])

  if (!port) return false

  /*
  console.log(srcmac)
  console.log(srcmacResolved)
  console.log(dstmac)
  console.log(distmacResolved)

  console.log(port)
  console.log(srcport)
  console.log(dstport)

  console.log(srcip)
  console.log(dstip)

  console.log(method)
  console.log(userAgent)
  console.log(host)
  console.log(requestUri)
  console.log(cookie)
  console.log(contentType)
  */

  let account = ''
  let password = ''

  if (method === 'POST') {
    const query = qs.parse(httpData)

    var keys = Object.keys(query)
    keys.forEach(key => {
      if (userFields.indexOf(key) > -1) {
        account = query[key]
      } else if (passFields.indexOf(key) > -1) {
        password = query[key]
      }
    })

    if (account || password) {
      const row = [account, password, port, host, dstip, srcip, srcmac]

      tableData.unshift(row)

      table.setData({
        headers: tableHeaders,
        data: tableData
      })

      screen.render()
    }
  }
}

/*
          var firstLine = headerContent[0];
          var uri = firstLine.split(" ")[1];
          var urlParse = uri.split("?");
          var path = urlParse[0];
          content = urlParse[1];

          var pattern = new RegExp("\.(jpg|png|gif|jpeg|bmp)$", "i");

          if (pattern.test(path)) {
              picture = "http://" + domain + uri;
              request.head(picture, function (error, response) {
                  var status = response.statusCode;
                  if (!error && status === 200) {
                      var picture = picture;
                  }
                  else {
                      picture = null;
                  }
              })
          }
          */
