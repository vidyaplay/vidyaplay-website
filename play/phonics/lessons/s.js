/* Lesson 1: the s sound, with Sunny the Sun. Data only: every word, picture, clip and screen text for this lesson.
   Audio clips are her Lauren recording (13 Nov 2026), cut into play/phonics/audio/<name>.mp3. */
VP.lesson({
  id: "s", letter: "s", soundText: "sss", soundClip: "sss", synth: "hiss",
  base: "",                                                // s keeps its files in play/phonics/ (audio/, *.webp)
  character: { name: "Sunny the Sun", img: "sunny.webp", alt: "Sunny the Sun, smiling" },
  parentNote: '<b>For parents:</b> Sit with your child. Say the sound "sss" (a long hiss, not "suh"). Progress is saved only on this device, nothing is sent to us. No sign-up needed.',
  vocab: {
    star:  { img: "star.webp",  first: "s", yes: "y_star",  yesText: "Yes! Sss, star!" },
    sock:  { img: "sock.webp",  first: "s", yes: "y_sock",  yesText: "Yes! Sss, sock!" },
    spoon: { img: "spoon.webp", first: "s", yes: "y_spoon", yesText: "Yes! Sss, spoon!" },
    sofa:  { img: "sofa.webp",  first: "s", yes: "y_sofa",  yesText: "Yes! Sss, sofa!" },
    snail: { img: "snail.webp", first: "s", yes: "y_snail", yesText: "Yes! Sss, snail!" },
    ball:  { img: "ball.webp",  first: "b", no: "n_ball" },
    cat:   { img: "cat.webp",   first: "c", no: "n_cat" },
    dog:   { img: "dog.webp",   first: "d", no: "n_dog" },
    hat:   { img: "hat.webp",   first: "h", no: "n_hat" },
    moon:  { img: "moon.webp",  first: "m", no: "n_moon" },
    cup:   { img: "cup.webp",   first: "c", no: "n_cup" },
    sun:   { img: "sunny.webp", first: "s", yes: "y_sun", yesText: "Yes! Sss, sun!" }     // her extra line, 14 Nov
  },
  steps: [
    { type: "intro", title: "Meet Sunny the Sun", audio: "intro", hearLabel: "🔊 Hear sss",
      text: "Sunny wants to shine on things that start with <b>sss</b>. Can you help?" },
    { type: "listen", title: "Do the action", icon: "✋", audio: "slide", soundLabel: "🔊 sss", doneLabel: "I did it!",
      text: "Slide your hand from side to side, like a slide, and say <b>sssss</b>." },
    { type: "pictures", game: "tap", title: "Tap the pictures that start with sss", audio: "feed",
      wrongText: "Oh no! {Word} starts with {first}. Sunny wants sss.",
      rounds: [["star", "ball", "sock", "cat"], ["dog", "spoon", "hat", "snail"], ["moon", "sofa", "cup"]],
      oddRounds: [["star", "sock", "ball", "spoon"], ["snail", "cat", "sofa", "star"]],   // used only if game is set to oddOneOut
      finish: { title: "Hooray!", text: "Sunny is shining bright! You found all the sss pictures!", audio: "hooray", alt: "Sunny the Sun shining bright" } },
    { type: "scene", title: "Find the sss things in the garden", audio: "feed", img: "scene_garden.webp",
      alt: "A sunny garden with a house, a picnic mat, a cat, a dog and many things to find",
      wrongText: "Oh no! {Word} starts with {first}. Sunny wants sss.",
      finish: { text: "Wow! You found all the sss things in the garden!" },
      spots: [                                              // box = left, top, width, height in % of the picture (checked on the picture 14 Nov)
        { word: "star",  box: [29.9, 12.8, 9.9, 21.3] }, { word: "sock",  box: [58.3, 25.0, 7.5, 18.6] },
        { word: "spoon", box: [28.1, 83.4, 18.5, 10.1] }, { word: "sofa", box: [16.4, 36.7, 23.0, 23.4] },
        { word: "snail", box: [6.9, 53.7, 12.6, 15.9] },  { word: "sun",  box: [77.2, 6.4, 14.4, 23.4] },
        { word: "moon",  box: [12.9, 14.9, 11.4, 20.2] }, { word: "cat",  box: [37.7, 54.7, 13.8, 26.0] },
        { word: "dog",   box: [56.8, 51.0, 14.7, 26.6] }, { word: "hat",  box: [80.4, 38.8, 16.1, 13.3] },
        { word: "ball",  box: [76.0, 62.7, 14.4, 23.4] }, { word: "cup",  box: [52.9, 79.7, 11.7, 14.9] } ] },
    { type: "letters", title: "Which letter says sss?", text: "Press the speaker, then tap the letter.", audio: "which", hearLabel: "🔊 Hear it",
      choices: ["t", "s", "m"], answer: "s",
      yes: { text: "Yes! The letter s says sss.", audio: "letter_yes" },
      no:  { text: "Not that one. Listen again: sss.", audio: "letter_no" } },
    { type: "trace", title: "Write the s", text: "Put your finger on the green dot. Go round like a slide.",
      path: "M 196 92 C 172 58 98 56 92 102 C 86 146 192 140 196 196 C 200 246 112 254 82 214",
      audio: ["trace1", "trace2"], great: { text: "Great writing!", audio: "great" } },
    { type: "done", title: "Well done!", text: "S says <b>sss</b>, like sun, star and sock.", audio: ["done", "next"],
      link: { text: "Print the free Letter S worksheets", href: "../../lkg/english/letter-s/" } }
  ]
});
