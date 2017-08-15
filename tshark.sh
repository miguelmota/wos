#!/bin/bash

WOS_INTERFACE=$1
WOS_SSID=$2
WOS_PASS=$3

tshark -I -i $WOS_INTERFACE -o wlan.enable_decryption:TRUE -o "uat:80211_keys:\"wpa-pwd\",\"$WOS_PASS:$WOS_SSID\"" -T json -V -Y "tcp.port==80 or udp.port==80 or eapol" 2> /dev/null

