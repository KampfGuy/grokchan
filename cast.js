// Character cast: shared by app.js (classic script), avatar.js and pose.js (modules) via window.CAST.
window.CAST=[
 {id:"kanya", name:"Kanya-Chan",   ja:"カーニャちゃん", type:"Tsundere", model:"grokchan.vrm", thumb:"thumbs/kanya.png",  accent:"#ff5fa2", accent2:"#ff8ec0", speaker:6,  voice:"VOICEVOX:四国めたん（ツンツン）"},
 {id:"himeka",name:"Himeka-sama",  ja:"ヒメカさま",     type:"DereDere gyaru", model:"himeka.vrm", thumb:"thumbs/himeka.png", accent:"#ffad33", accent2:"#ffcb73", speaker:8,  voice:"VOICEVOX:春日部つむぎ"},
 {id:"shiori",name:"Shiori-senpai",ja:"しおり先輩",     type:"Yandere",  model:"shiori.vrm",   thumb:"thumbs/shiori.png", accent:"#34c58a", accent2:"#7ee0b5", speaker:4,  voice:"VOICEVOX:四国めたん（セクシー）"},
 {id:"koyuki",name:"Koyuki-sama",  ja:"小雪さま",       type:"Kuudere fox", model:"koyuki.vrm",  thumb:"thumbs/koyuki.png", accent:"#7cc4ff", accent2:"#b5ddff", speaker:14, voice:"VOICEVOX:冥鳴ひまり"}];
window.castById=id=>window.CAST.find(c=>c.id===id)||window.CAST[0];
