/* ==========================================================================
   English Base — word data
   --------------------------------------------------------------------------
   Empty on purpose: the interface is built and verified before any vocabulary
   is added. js/render-words.js reads these two arrays and builds the tables;
   everything downstream reads the DOM it produces.

   EN_WORDS record:
     id        integer, ordering only
     word      the English headword                        -> data-key, TTS
     ipa       IPA transcription, stress marks included    -> data-ipa
     ru        Russian translation                         -> data-ru
     kk        Kazakh translation                          -> data-kk
     def       English definition (shown in the en locale)  -> data-def
     pos       pos_noun | pos_verb | pos_adj | pos_adv | pos_det |
               pos_interj | pos_conj | pos_prep | pos_pron -> data-section
     group     id of the EN_GROUPS entry it belongs to
     root      word root, e.g. "spect"                     -> data-root
     affix     prefix or suffix, e.g. "in-"                -> data-affix
     cefr      a1 | a2 | b1 | b2 | c1 | c2                  -> data-cefr
     ex        example sentence
     ex_ipa    IPA of the example
     ex_ru     Russian translation of the example
     ex_kk     Kazakh translation of the example
     ex_def    English paraphrase of the example

   EN_GROUPS record:
     id                  becomes the <tbody> id
     root, root_key      display root and its lowercase sort key
     affix, affix_key    display affix and its lowercase sort key
     standalone          true for the catch-all "standalone words" group
     pos_heading_before  a POS id to emit an <h2> before this group, or null
   ========================================================================== */
window.EN_WORDS  = [];
window.EN_GROUPS = [];
