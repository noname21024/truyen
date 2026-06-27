export interface StickerSet {
  id: string;
  name: string;
  baseUrl: string;
  items: string[];
}

export const STICKER_SETS: StickerSet[] = [
  {
    id: "trollface",
    name: "Trollface",
    baseUrl: "https://pub-71585e468cd741989c43b01356ee9591.r2.dev/gif/trollface/",
    items: [
      "01-kyghe.gif", "02-ahihi.gif", "03-trollgif.gif", "04-lolol.gif", "05-lolol2.gif", "05-lolol3.gif", 
      "06-BlackGuyBeaten.gif", "07-ahaha.gif", "08-Pfftch.gif", "09-dapban.gif", "10-trolldance.gif", 
      "11-Devil.gif", "12-ExcitedTroll.gif", "13-Gay.gif", "13-slap.gif", "13-troll-typing.gif", 
      "13-u-mad-troll.gif", "14-yaoming.gif", "15-pff.gif", "16-yao_ming_heck_no.gif", "18-hichic.gif", 
      "19-hichic2.gif", "20-hichic3.gif", "21-TheSaddest.gif", "22-Baww.gif", "23-SoMuchWin.gif", 
      "24-BigGrin.gif", "25-AwwYeah.gif", "26-ForeverDontCare.gif", "27-ForeverAlone.gif", 
      "28-ForeverAlone2.gif", "29-ForeverAloneExcited.gif", "30-SoonComputer.gif", "31-wtf.gif", 
      "32-Facepalm.gif", "33-Shocked.gif", "34-MotherofGod.gif", "35-GreatScott.gif", "36-Gasp.gif", 
      "36-panel-NOPE.gif", "37-FullPanel.gif", "37-surprised-oh-fuck-no.jpeg", "38-beerGuy.gif", 
      "38-CerealGuy.gif", "39-CerealSpitting.gif", "40-NewspaperGuy.gif", "41-NewspaperGuyTear.gif", 
      "42-Milk.jpeg", "43-AreYouKiddingMe.gif", "44-ohgodwhy.gif", "45-scary.gif", "46-Rage.gif", 
      "47-Rage2.gif", "48-Shaking.gif", "49-FapGuy.gif", "50-FapGirl.gif", "51-SweetJesus.gif", 
      "52-dogSweetJesus.gif", "53-PokerFace.gif", "54-PokerFace2.gif", "55-HerpDerp.gif", 
      "56-ConflictingEmotions.gif", "57-DudeComeOn.gif", "58-Determined.gif", "59-iamcute.gif", 
      "60-Thoughtful.gif", "62-FckYea.gif", "62-FuckYea.gif", "63-ChallengeAccepted.gif", 
      "64-okay.gif", "64-OkayGuy.gif", "65-Sword.gif", "66-You-Dont-Say.jpeg", "67-EWBTE.gif", 
      "68-ComputerAlone.jpeg", "69-MeGusta.gif", "71-PhoenixWright.gif", "72-so-close.jpeg", 
      "72-so-close2.jpeg", "73-GrandmaInTheDark.gif", "74-TrueStory.jpeg", "75-WatchingYou.gif", 
      "76-WhatHaveYouDone.gif", "77-WhyWithHands.gif", "78-YUNO.gif", "79-ilied.gif", 
      "80-youre-the-man.gif", "81-notingtodohere.gif", "82-fckyou.gif", "83-hah-gay.gif", 
      "84-knife-self.gif", "85-knowthatfeel.gif", "86-eyebrow-look.gif", "87-fus-ro-dah.gif", 
      "88-bloody-keyboard.gif", "89-wow.gif", "90-rainbow_puke.gif", "91-mouth_wide_open.gif", 
      "92-music_shit.gif", "93-stoned_what.gif", "94-crying_animation.gif", "95-must_resist.gif", 
      "96-pedobear.gif", "97-pedobear_coming.gif", "98-success_kid.gif", "99-ruserious.gif", 
      "100-ifyouknowwhatimean.gif", "101-DButt.gif", "102-mustnotfap.gif", "103-7SpiderpMan.gif", 
      "104-HatersGonnaHate.gif", "105-High.gif", "106-Dejected.gif", "107-NotOkay.gif", 
      "108-NotOkayAtAll.gif", "109-Genius.gif", "110.gif", "111-Mirada-Fija.gif", 
      "112-angry-desk-flip.jpeg", "113-angry-eternal-contempt.jpeg", "114-angry-thanks.jpeg", 
      "115-rage-crazy-rage.jpeg", "116-jackychan.jpeg", "117-disgusted-impossibru.jpeg", 
      "118-watchingporn.gif", "doge.gif", "doge2.gif"
    ]
  },
  {
    id: "onion",
    name: "Onion",
    baseUrl: "https://pub-71585e468cd741989c43b01356ee9591.r2.dev/gif/onion/",
    items: [
      "001.gif", "002.gif", "003.gif", "004.gif", "005.gif", "006.gif", "007.gif", "008.gif", "009.gif", 
      "010.gif", "011.gif", "012.gif", "013.gif", "014.gif", "015.gif", "016.gif", "017.gif", "018.gif", 
      "019.gif", "020.gif", "021.gif", "022.gif", "023.gif", "024.gif", "025.gif", "026.gif", "027.gif", 
      "028.gif", "029.gif", "030.gif", "031.gif", "032.gif", "033.gif", "034.gif", "035.gif", "036.gif", 
      "038.gif", "039.gif", "040.gif", "041.gif", "042.gif", "043.gif", "044.gif", "045.gif", "046.gif", 
      "047.gif", "048.gif", "049.gif", "050.gif", "051.gif", "052.gif", "053.gif", "054.gif", "055.gif", 
      "056.gif", "057.gif", "058.gif", "059.gif", "060.gif", "061.gif", "062.gif", "063.gif", "064.gif", 
      "065.gif", "066.gif", "067.gif", "068.gif", "069.gif", "070.gif", "071.gif", "072.gif", "073.gif", 
      "074.gif", "075.gif", "076.gif", "077.gif", "078.gif", "079.gif", "080.gif", "081.gif", "082.gif", 
      "083.gif", "084.gif", "085.gif", "086.gif", "087.gif", "088.gif", "089.gif", "090.gif", "091.gif", 
      "092.gif", "093.gif", "094.gif", "095.gif", "096.gif", "097.gif", "098.gif", "099.gif", "100.gif", 
      "101.gif", "102.gif", "103.gif", "104.gif", "105.gif", "106.gif", "107.gif", "108.gif", "109.gif", 
      "110.gif", "111.gif", "112.gif"
    ]
  },
  {
    id: "tho_tzuki",
    name: "Tuzki",
    baseUrl: "https://pub-71585e468cd741989c43b01356ee9591.r2.dev/gif/tho_tzuki/",
    items: [
      "Upanhso.tk-1.gif", "Upanhso.tk-2.gif", "Upanhso.tk-3.gif", "Upanhso.tk-4.gif", "Upanhso.tk-5.gif", 
      "Upanhso.tk-6.gif", "Upanhso.tk-7.gif", "Upanhso.tk-8.gif", "Upanhso.tk-9.gif", "Upanhso.tk-10.gif", 
      "Upanhso.tk-11.gif", "Upanhso.tk-12.gif", "Upanhso.tk-13.gif", "Upanhso.tk-14.gif", "Upanhso.tk-15.gif", 
      "Upanhso.tk-16.gif", "Upanhso.tk-17.gif", "Upanhso.tk-18.gif", "Upanhso.tk-19.gif", "Upanhso.tk-20.gif", 
      "Upanhso.tk-21.gif", "Upanhso.tk-22.gif", "Upanhso.tk-23.gif", "Upanhso.tk-24.gif", "Upanhso.tk-25.gif", 
      "Upanhso.tk-26.gif", "Upanhso.tk-27.gif", "Upanhso.tk-28.gif", "Upanhso.tk-29.gif", "Upanhso.tk-30.gif", 
      "Upanhso.tk-31.gif", "Upanhso.tk-32.gif", "Upanhso.tk-33.gif", "Upanhso.tk-34.gif", "Upanhso.tk-35.gif", 
      "Upanhso.tk-36.gif", "Upanhso.tk-37.gif", "Upanhso.tk-38.gif", "Upanhso.tk-39.gif", "Upanhso.tk-40.gif", 
      "Upanhso.tk-41.gif", "Upanhso.tk-42.gif", "Upanhso.tk-43.gif", "Upanhso.tk-44.gif", "Upanhso.tk-45.gif", 
      "Upanhso.tk-46.gif", "Upanhso.tk-47.gif", "Upanhso.tk-48.gif", "Upanhso.tk-49.gif", "Upanhso.tk-50.gif", 
      "Upanhso.tk-51.gif", "Upanhso.tk-52.gif", "Upanhso.tk-53.gif", "Upanhso.tk-54.gif", "Upanhso.tk-55.gif", 
      "Upanhso.tk-56.gif", "Upanhso.tk-57.gif", "Upanhso.tk-58.gif", "Upanhso.tk-59.gif", "Upanhso.tk-60.gif"
    ]
  }
];
