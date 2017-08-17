const getProp = require('get-prop')

function formatPacket(layers) {
  const get = getProp(layers)
  const eth = getProp(layers.eth || {})
  const tcp = getProp(layers.tcp || {})
  const ip = getProp(layers.ip || {})
  const http = getProp(layers.http || {})
  const wlan = getProp(layers.wlan || {})
  const eapol = getProp(layers.eapol || {})

  return {
    srcmac: eth(['eth.src', 'eth.addr']),
    srcmacResolved: get(['eth.src', 'eth.addr_resolved']),
    dstmac: eth(['eth.dst', 'eth.addr']),
    distmacResolved: eth(['eth.dst', 'eth.addr_resolved']),

    port: tcp(['tcp.port']),
    srcport: tcp(['tcp.srcport']),
    dstport: tcp(['tcp.dstport']),

    srcip: ip(['ip.src']),
    dstip: ip(['ip.dst']),

    method: http([Object.keys(get(['http'], {}))[0], 'http.request.method']),
    userAgent: http(['http.user_agent']),
    host: http(['http.host']),
    fullRequestUri: http(['http.request.full_uri']),
    cookie: http(['http.cookie']),
    contentType: http(['http.content_type']),
    httpData: http(['http.file_data']),

    eapolDataLen: eapol(['wlan_rsna_eapol.keydes.data_len']),
    wlanMac: wlan(['wlan.staa']),
    wlanMacResolved: wlan(['wlan.staa_resolved']),

    ftp: get(['ftp'])
  }
}

module.exports = formatPacket
