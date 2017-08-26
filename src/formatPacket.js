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
    srcmac: eth(['eth_eth_src_eth_addr']),
    srcmacResolved: get(['eth_eth_src_eth_addr_resolved']),
    dstmac: eth(['eth_eth_dst_eth_addr']),
    distmacResolved: eth(['eth_eth_dst_eth_addr_resolved']),

    port: tcp(['tcp_tcp_port']),
    srcport: tcp(['tcp_tcp_srcport']),
    dstport: tcp(['tcp_tcp_dstport']),

    srcip: ip(['ip_ip_src']),
    dstip: ip(['ip_ip_dst']),

    method: http(['text_http_request_method']),
    userAgent: http(['http_http_user_agent']),
    host: http(['http_http_host']),
    fullRequestUri: http(['http_http_request_full_uri']),
    cookie: http(['http_http_cookie']),
    contentType: http(['http_http_content_type']),
    httpData: http(['http_http_file_data']),

    eapolDataLen: eapol(['eapol_wlan_rsna_eapol_keydes_data_len']),
    wlanMac: wlan(['wlan_wlan_staa']),
    wlanMacResolved: wlan(['wlan_wlan_staa_resolved']),

    ftp: get(['ftp']),
    imap: get(['imap']),
    pop: get(['pop']),
    smtp: get(['smtp']),
    telnet: get(['telnet']),
    telnetData: get(['telnet', 'telnet_telnet_data'])
  }
}

module.exports = formatPacket
