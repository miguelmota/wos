#!/bin/bash

tshark -i en0 -o wlan.enable_decryption:TRUE -o "uat:80211_keys:\"wpa-pwd\",\"$WOS_PASS:$WOS_SSID\"" -T json -Y "tcp.port==80 or udp.port==80 or eapol" 2> /dev/null
