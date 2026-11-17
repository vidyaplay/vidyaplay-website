/* Lesson 2: the short a sound, with Andy the Ant. Data only. Audio: her Lauren recording (16 Nov 2026), cut into a/audio/<name>.mp3.
   Sound spelling used for the recording: see phonics/lesson2_a_script_groups.md. */
VP.lesson({
  id: "a", letter: "a", soundText: "a", soundClip: "a_sound", synth: "voice",
  base: "a/",
  character: { name: "Andy the Ant", img: "andy.webp", alt: "Andy the Ant, smiling and waving" },
  parentNote: '<b>For parents:</b> Sit with your child. This is the short <b>a</b> sound, like the start of apple and ant (not the letter name "ay"). Progress is saved only on this device, nothing is sent to us. No sign-up needed.',
  vocab: {
    apple:     { img: "apple.webp", first: "a", yes: "y_apple",     yesText: "Yes! Apple starts with a." },
    ant:       { img: "ant.webp", first: "a", yes: "y_ant",       yesText: "Yes! Ant starts with a." },
    anchor:    { img: "anchor.webp", first: "a", yes: "y_anchor",    yesText: "Yes! Anchor starts with a." },
    ambulance: { img: "ambulance.webp", first: "a", yes: "y_ambulance", yesText: "Yes! Ambulance starts with a." },
    alligator: { img: "alligator.webp", first: "a", yes: "y_alligator", yesText: "Yes! Alligator starts with a." },
    ball: { img: "ball.webp", first: "b", no: "n_ball" }, cat: { img: "cat.webp", first: "c", no: "n_cat" }, dog: { img: "dog.webp", first: "d", no: "n_dog" },
    hat:  { img: "hat.webp", first: "h", no: "n_hat" },  moon: { img: "moon.webp", first: "m", no: "n_moon" }, cup: { img: "cup.webp", first: "c", no: "n_cup" }
  },
  steps: [
    { type: "intro", title: "Meet Andy the Ant", audio: ["a_hello_ant", "a_hello"], hearLabel: "🔊 Hear the a sound",
      text: "Andy loves the <b>a</b> sound, like <b>a</b>pple. Can you help Andy?" },
    { type: "discover", title: "Andy makes an a!", audio: "a_trail", hearLabel: "🔊 Say the a sound", seconds: 4.5,
      text: "Watch Andy walk and make the letter <b>a</b>. Say the sound with Andy!",
      path: "M 196 112 C 160 80 90 102 88 160 C 86 216 156 242 196 198 L 196 112 L 196 246" },
    { type: "pictures", game: "basket", title: "Pack Andy's picnic basket", audio: "a_picnic",
      wrongText: "Oh no! {Word} does not start with the a sound. Andy wants a.",
      rounds: [["apple", "ball", "ant", "cat"], ["dog", "anchor", "hat", "ambulance"], ["moon", "alligator", "cup"]],
      finish: { title: "Hooray!", text: "Andy has a full picnic basket!", audio: "a_picnic_done", alt: "A full picnic basket" } },
    { type: "shadow", title: "Mystery shadows", text: "Whose shadow is this? Tap the matching picture.", audio: "a_safari",
      wrongText: "Not that one. Look at the shadow again.", wrongAudio: "letter_no",
      rounds: [ { word: "ant", choices: ["ant", "apple", "anchor"] }, { word: "apple", choices: ["anchor", "apple", "ant"] }, { word: "anchor", choices: ["ant", "anchor", "apple"] } ],
      finish: { title: "You found them all!", text: "Andy is so happy!", audio: "found3" } },
    { type: "speak", title: "Say it slowly",
      items: [ { word: "ant", img: "ant.webp", text: "Ant… a-nt", audio: "say_ant" },
               { word: "apple", img: "apple.webp", text: "Apple… a-pple", audio: "say_apple" },
               { word: "anchor", img: "anchor.webp", text: "Anchor… a-nchor", audio: "say_anchor" } ],
      finish: { title: "Great talking!", text: "Now you try it. Say it slowly: a, a.", audio: "say_try" } },
    { type: "letters", title: "Which letter says a?", text: "Press the speaker, then tap the letter.", audio: "which", hearLabel: "🔊 Hear it",
      choices: ["t", "a", "m"], answer: "a",
      yes: { text: "Yes! The letter a says a.", audio: "letter_yes" },
      no:  { text: "Not that one. Listen again.", audio: "letter_no" } },
    { type: "trace", title: "Write the a", text: "Put your finger on the green dot. Go round, then down.",
      path: "M 196 112 C 160 80 90 102 88 160 C 86 216 156 242 196 198 L 196 112 L 196 246",
      audio: ["trace1", "trace2"], great: { text: "Great writing!", audio: "great" } },
    { type: "done", title: "Well done!", text: "A says <b>a</b>, like apple, ant and anchor.", audio: ["done", "next"],
      link: { text: "Print the free Letter A worksheets", href: "../../lkg/english/letter-a/" } }
  ]
});
