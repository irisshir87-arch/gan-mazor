(function(){
  "use strict";
  const KEY="ganMazorStateV2";
  const defaults={
    home:{updatedAt:"12:30",morning:[{name:"יעל",role:"גננת",image:"assets/staff-yael.svg"},{name:"מיכל",role:"סייעת",image:"assets/staff-michal.svg"}],afternoon:[{name:"לירון",role:"מובילת צהרון",image:"assets/staff-liron.svg"},{name:"שירה",role:"סייעת",image:"assets/staff-shira.svg"}],meetingTitle:"העונות ומזג האוויר",meetingDetails:"דיברנו על קיץ וחורף, מיינו פריטי לבוש לפי העונה ולמדנו את השיר „איזה יום יפה”.",activityTitle:"מוזיקה ותנועה עם דנה",reminder:"להביא בקבוק מים וכובע",shabbat:[{name:"נועם",image:"assets/kid-noam.svg"},{name:"איה",image:"assets/kid-aya.svg"}]},
    events:[{id:"e1",date:"2026-07-27",title:"אין גן",details:"יום היערכות לצוות",type:"no-kindergarten"},{id:"e2",date:"2026-07-30",title:"יום הולדת לליה",details:"חוגגים במפגש הבוקר",type:"birthday"},{id:"e3",date:"2026-08-02",title:"מסיבת קיץ",details:"אירוע משפחות בחצר הגן",type:"event"}],
    albums:[{id:"a1",date:"2026-07-24",expires:"2026-07-31",photos:["assets/album-1.svg","assets/album-2.svg","assets/album-3.svg","assets/album-4.svg"]},{id:"a2",date:"2026-07-23",expires:"2026-07-30",photos:["assets/album-5.svg","assets/album-6.svg","assets/album-7.svg","assets/album-8.svg"]}],
    committee:{collected:4600,paybox:"https://payboxapp.page.link/",expenses:[{id:"x1",description:"מתנות סוף שנה",amount:980,date:"2026-06-20"},{id:"x2",description:"ציוד למסיבת קיץ",amount:480,date:"2026-07-10"},{id:"x3",description:"קישוטים",amount:300,date:"2026-07-14"}],poll:{active:true,title:"באיזה יום נקיים את מסיבת הקיץ?",options:["יום חמישי, 31.7","יום שישי, 1.8"]},treats:{active:true,title:"מסיבת סיום",items:[{label:"פירות חתוכים",claimedBy:""},{label:"עוגה",claimedBy:"נועם"},{label:"שתייה",claimedBy:""}]}}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function load(){try{return {...clone(defaults),...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{return clone(defaults)}}
  function save(state){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent("gan-state-change",{detail:state}));return state}
  function reset(){localStorage.removeItem(KEY);return load()}
  window.GanState={load,save,reset,defaults:clone(defaults)};
})();