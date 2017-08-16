#!/bin/bash

WOS_INTERFACE=$1
WOS_SSID=$2
WOS_PASS=$3
WOS_MONITOR="-I"

# check if monitor disable option
if [ "$4" -eq "1" ]; then
  WOS_MONITOR=""
fi

DEC_KEYS=""
if [ ! -z "$WOS_PASS" ]; then
  DEC_KEYS="-o uat:80211_keys:\"wpa-pwd\",\"$WOS_PASS:$WOS_SSID\""
fi

FILTERS="tcp.port==80 or udp.port==80 or eapol"

CMD='tshark $WOS_MONITOR -i $WOS_INTERFACE -o wlan.enable_decryption:TRUE $DEC_KEYS -T json -V -Y "$FILTERS" 2> /dev/null'

eval $CMD

