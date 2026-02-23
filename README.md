$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("__utma", "200924205.589060008.1771820854.1771820854.1771820854.1", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmc", "200924205", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmz", "200924205.1771820854.1.1.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided)", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga", "GA1.1.1909732098.1771821905", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_F8VP9T1NT3", "GS2.1.s1771821904`$o1`$g1`$t1771824440`$j27`$l0`$h0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("GuestData", "UserID=-297810396", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("rbx-ip2", "1", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXcb", "RBXViralAcquisition%3Dtrue%26RBXSource%3Dtrue%26GoogleAnalytics%3Dtrue", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSource", "rbx_acquisition_time=02/23/2026 04:25:33&rbx_acquisition_referrer=https://www.google.com/&rbx_medium=Social&rbx_source=www.google.com&rbx_campaign=&rbx_adgroup=&rbx_keyword=&rbx_matchtype=&rbx_send_info=0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__stripe_mid", "0d5acf9b-420d-4086-b679-4baeed962d55f49979", "/", ".www.roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__stripe_sid", "ce2837a1-0d0f-4766-9186-eceb0e7f5be37e26c7", "/", ".www.roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmt_b", "1", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie(".ROBLOSECURITY", "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhsKBGR1aWQSEzUyNzg3MDM3NTQ2MTY1OTc1MDEoAw.JptgCDBTgHb8-Pj8iM1wc01T_v4dq9Lcg8K2nHDWQZTvwPPuiiRGIQaD0uN8eIFh0OSZYpHa_i4OeFw2sdvSfXr5S5WOaXul3ZT8s8AeZ7Ez0qr1PGHZg7vKfcM9xShSmMQScedvj-li_-zFKouvVkZhAl9U6iTUiwe2ULQyax6wPv5n0P8FbLv6FblN7n46kT8sshR41HPaUTYH1oFL2eX0H-1GVEnQjSvHT-FnBNVfZDEs1CU9_iARmSVaHlKdEMA5KRDPloR0jXyO-AMsZIbjlyMPQiObn8RXUJa2_qIoU68XDwAfKvfc_hO3SamSpRmbEn1pY-fCUsgcZq-BhYNe0PhssXk3UReZYTVopGpggViCUl-o3VP80-EG8wuoDq6Nlgmme3rK0lSMSuzWnhnSYnfWJ0LrRxBy5WWeu05IRinAhqiSD2m1XTES2d4S_TrLDI6ghSVYxBaQT800yr4k3hRSu_r11bWIfsiiCM5E8W4qg6TnA-SyjaUSLpegmGPWR6EVGlDJHSxhnHcf-DHbi6tLOzhG30-EP0vqaB4KF0iGx4UD_AtVlxD48lxI2fbvoc8bM7vXf9W9GIIXXqyZHxP4OlbHACBbtq0AgAzUtd_jkwYlED0IOPkvjt8QHOwTxNCKGMdBGfs7sSyEybl0-dtz7e6lj-QPOhW9XSCFIkMrDGO-mPuAje-2q75As1YmUoRF54DcvLC78tqhV2f90H3S6_55sIBx5ZbJAYYk9kVFo4IEzb6eiOl1ixiHpPWQztaeXp4OF9r8H1Bn_2Kv03o", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSessionTracker", "sessionid=f604ecd4-7e60-42e9-b005-33330c58a675", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXEventTrackerV2", "CreateDate=02/22/2026 23:38:35&rbxid=6099532495&browserid=1771820707710002", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmb", "200924205.82.10.1771820854", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXPaymentsFlowContext", "b382eae0-46ce-4c65-9e77-3447e39e8bc5,", "/", ".roblox.com")))
Invoke-WebRequest -UseBasicParsing -Uri "https://www.roblox.com/users/7677723375/profile?nl=true" `
-WebSession $session `
-Headers @{
"authority"="www.roblox.com"
  "method"="GET"
  "path"="/users/7677723375/profile?nl=true"
  "scheme"="https"
  "accept"="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  "accept-encoding"="gzip, deflate, br, zstd"
  "accept-language"="vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5"
  "cache-control"="max-age=0"
  "priority"="u=0, i"
  "referer"="https://www.roblox.com/vi/login?returnUrl=https%3A%2F%2Fwww.roblox.com%2Fvi%2Fusers%2F7677723375%2Fprofile"
  "sec-ch-ua"=""Google Chrome";v=`"131`", "Chromium";v=`"131`", "Not_A Brand";v=`"24`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"=""Windows""
  "sec-fetch-dest"="document"
  "sec-fetch-mode"="navigate"
  "sec-fetch-site"="same-origin"
  "sec-fetch-user"="?1"
  "upgrade-insecure-requests"="1"
}