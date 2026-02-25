$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("RBXcb", "RBXViralAcquisition%3Dtrue%26RBXSource%3Dtrue%26GoogleAnalytics%3Dtrue", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmz", "200924205.1767925630.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga", "GA1.1.1341585179.1767926573", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("GuestData", "UserID=-1497446503", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXcb", "RBXViralAcquisition%3Dtrue%26RBXSource%3Dtrue%26GoogleAnalytics%3Dtrue", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSource", "rbx_acquisition_time=02/09/2026 14:58:30&rbx_acquisition_referrer=&rbx_medium=Social&rbx_source=&rbx_campaign=&rbx_adgroup=&rbx_keyword=&rbx_matchtype=&rbx_send_info=0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__stripe_mid", "a4f60d2a-55fa-4d39-9516-ceb7f1fe6acc9e65f2", "/", ".www.roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("rbx-ip2", "1", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utma", "200924205.1184304945.1767925630.1771955404.1771998823.52", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmb", "200924205.0.10.1771998823", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("__utmc", "200924205", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_F8VP9T1NT3", "GS2.1.s1771999288`$o20`$g1`$t1771999718`$j1`$l0`$h0", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXSessionTracker", "sessionid=60601adc-4d90-4a55-be1e-a9b82b92cff8", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXEventTrackerV2", "CreateDate=02/25/2026 00:30:22&rbxid=8922176971&browserid=1770700713541002", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("RBXPaymentsFlowContext", "5171541e-1abd-48c5-a9bf-ba26513737dd,", "/", ".roblox.com")))
$session.Cookies.Add((New-Object System.Net.Cookie(".ROBLOSECURITY", "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhsKBGR1aWQSEzM4NTcyNjY5NzU4NDg3NzU0MjYoAw.T8s5kmSRI_1jrOB2Kb8-CVTppdgnyCwQ1FYqm__846fHSVOk_3M5UcdssO-ZDhKJPT62CQjN4y2bvjrEOlPuJem1sZskIDVhngi4YB8hppxEJvPZjHy8KBxF2Mn2DnbWSwxmzjCP88nYH2vvj1wvPj3js-_SGEwZR7eSRmpW6UWWOqpPJC8TFZ1NzdTjKTHp7mz_JFxLVvAZ6eEASWGaU7bmCd-oiBydHK6JB74RHHIT-Q1vtZ69K6nmqTsOQHxPMLBWAMCzj4XXr-kLeJDkY3tnqhiNxlduyXzvhX3h1TqJQIDe2VcSj4j6GzmJL_CDspFXneEWxtyqs3ISE-QX00B7KM4y7xC6KtBAqgZp0Ys2iNbdVWMP9wqsdF5GcoVVF8oAMXY0ItQZYRprap6Cw6mzR3IVu_KdDKBgXvByc35IlpyRTqFmfHThPrwRRsRhUxFOgxVcNoINIT02UEsROSpdoNx-2Jq0S9XYJ5RYSfLOe6oZma2uwtjN3sKyUXzs6lBwHeQZhuzjRDrsA0b3IOh7GUn_QcspZaiQsFW51_Im3zB1qNEEnPYu-NwEdb_VCgk6Fzp6QARIDZaZ4Epi003Q57DCmncM1C0Rf71jvQ87QFQ771AtVhV2z7O84wD5gm_8X-QxgGHRhg46waxvyzqgZJxgkoEqSCrfJbJ_wg_7XIycKfpt7HUlHmRwgU3ilspAbaojyEKnMjj15_Q243uiauqxQqgmWtz2ggdEpLMgRnqyXCLHK_gbL_pA1yhI03-MKDWBiSoW58z6Nx6OPPvTpUA", "/", ".roblox.com")))
Invoke-WebRequest -UseBasicParsing -Uri "https://www.roblox.com/vi/users/9198345069/profile?nl=true&nl=true&nl=true&nl=true&nl=true" `
-WebSession $session `
-Headers @{
"authority"="www.roblox.com"
  "method"="GET"
  "path"="/vi/users/9198345069/profile?nl=true&nl=true&nl=true&nl=true&nl=true"
  "scheme"="https"
  "accept"="text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  "accept-encoding"="gzip, deflate, br, zstd"
  "accept-language"="vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5"
  "priority"="u=0, i"
  "referer"="https://www.roblox.com/vi/login?returnUrl=https%3A%2F%2Fwww.roblox.com%2Fvi%2Fusers%2F9198345069%2Fprofile%3Fnl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue%26nl%3Dtrue"
  "sec-ch-ua"="`"Not:A-Brand`";v=`"99`", `"Google Chrome`";v=`"145`", `"Chromium`";v=`"145`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"="`"Windows`""
  "sec-fetch-dest"="document"
  "sec-fetch-mode"="navigate"
  "sec-fetch-site"="same-origin"
  "sec-fetch-user"="?1"
  "upgrade-insecure-requests"="1"
}