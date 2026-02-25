$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("RBXcb", "RBXViralAcquisition%3Dtrue%26RBXSource%3Dtrue%26GoogleAnalytics%3Dtrue", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmz", "200924205.1767925630.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga", "GA1.1.1341585179.1767926573", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("GuestData", "UserID=-1497446503", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXcb", "RBXViralAcquisition%3Dtrue%26RBXSource%3Dtrue%26GoogleAnalytics%3Dtrue", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSource", "rbx_acquisition_time=02/09/2026 14:58:30&rbx_acquisition_referrer=&rbx_medium=Social&rbx_source=&rbx_campaign=&rbx_adgroup=&rbx_keyword=&rbx_matchtype=&rbx_send_info=0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__stripe_mid", "a4f60d2a-55fa-4d39-9516-ceb7f1fe6acc9e65f2", "/", ".www.roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utma", "200924205.1184304945.1767925630.1771955404.1771998823.52", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmb", "200924205.0.10.1771998823", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmc", "200924205", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSessionTracker", "sessionid=60601adc-4d90-4a55-be1e-a9b82b92cff8", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("rbx-ip2", "1", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_F8VP9T1NT3", "GS2.1.s1772002977`$o21`$g0`$t1772003386`$j60`$l0`$h0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXPaymentsFlowContext", "c280cca5-c596-425a-8b3b-ea10fc01cece,", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie(".ROBLOSECURITY", "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhwKBGR1aWQSFDEyMjIzODcxNjYyMzY3ODg5MDUzKAM.kUteHj3ywqAsKfROVJGP8dQCevFEaFsZG1WWWuiLNKPtGfgRMu79XkB3YaUzBAZlCDkBsBe2DlBqk2muEsECfFT3iFCPlbeqinTSPCxmGtlHvMYNTbmicDgP_kpLtLBJbgayp6-ELgQ2Q0AwlP6gNEfZwzoRRXzqsztmlUzm-74bZzyVK7Im-ury5NMqWlFg7M4VRYULzCwhpFS4xBtHS5ji8_NIBXuxruJszA_j95GnpO3Zdw_HRcP7WPTpX2HC1iRi3WGTGSs5MzDd6vD8uuqHVjWqArcfFta0li_8_dEgBAhwOyAxnkuNRL9LgzHLJqpGb3QwPber71fw_ybyOP4k3cIMuZN0B6OfGXEatCDTJLsHZ-KEX3Jcfedxm2kytERYEuygjTxuqjtorozwLT_X36yGNzvPN9SxcdMmbs2-5_gUf-XMg02vn-vGX27qwTe5qmLDYTS8JX-obgQhYFevs3xfHm03Z4aNsGG8S_l1pZXniLerBBmayJk3ezsUlN4v7bJIh-w7KUXOiYfKlr2ieEDefsfmaHe5bizuYXLU9VofHOnuQKlCgvYh_5gv_FMV_E6RIvh7oNA2VTgDInDbgQDDV9X5zkQhx-6AFhkTbRU1-XdDJj2v99cEGNrBhgypidtuAOjSaE9xElHr3TtMysLJ9Yq5DMDyxTk2w1Sz-QPw0lFsHdaWmTsvinR-_10seFV5ASd9RkL1rnVN6c978tCruy6hd5trFVLsEEZ6tLm9TdUrMwHinxBk6e_G_4_f6wRu7ld4gYpAs_ZyAR7BViY", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXEventTrackerV2", "CreateDate=02/25/2026 01:18:28&rbxid=9460770261&browserid=1770700713541002", "/", ".roblox.com")))
Invoke-WebRequest -UseBasicParsing -Uri "https://www.roblox.com/vi/users/9198345069/profile?nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true" `
-WebSession $session `
-Headers @{
"authority"="www.roblox.com"
  "method"="GET"
  "path"="/vi/users/9198345069/profile?nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true&nl=true"
  "scheme"="https"
  "accept"="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  "accept-encoding"="gzip, deflate, br, zstd"
  "accept-language"="vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5"
  "cache-control"="max-age=0"
  "priority"="u=0, i"
  "referer"="https://www.roblox.com/vi/login?returnUrl=https%3A%2F%2Fwww.roblox.com%2Fvi%2Fusers%2F9198345069%2Fprofile%3Fnl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue"
  "sec-ch-ua"="`"Not:A-Brand`";v=`"99`", `"Google Chrome`";v=`"145`", `"Chromium`";v=`"145`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"="`"Windows`""
  "sec-fetch-dest"="document"
  "sec-fetch-mode"="navigate"
  "sec-fetch-site"="same-origin"
  "sec-fetch-user"="?1"
  "upgrade-insecure-requests"="1"
}