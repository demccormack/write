#let book-title = "{{BOOK_TITLE}}"
#let book-author = "{{BOOK_AUTHOR}}"

#set document(title: book-title, author: book-author)
#set page(paper: "us-letter", margin: 1in)
#set text(size: 12pt, lang: "en")
#set heading(numbering: "1.1")
#show link: underline

// Title page
#page(numbering: none)[
  #align(center + horizon)[
    #text(size: 28pt, weight: "bold", book-title)
    #v(1em)
    #text(size: 16pt, book-author)
  ]
]

// Copyright page
#page(numbering: none)[
  #align(center + bottom)[
    #block(width: 60%)[
      #set text(size: 6pt)
      © #book-author, #datetime.today().year()

      #v(1em)
      All rights reserved. No part of this publication may be copied, reproduced, stored in a retrieval system, or transmitted in any form or by any means without the prior written permission of the author.

      #v(1em)
      This book began with Write, the free and open-source book creation tool. Start your own book, contribute to the project, or support its development at #link("https://write.art/open-source")[write.art/open-source]
    ]
  ]
]

#outline()
#pagebreak()

#heading(numbering: none)[Preface]
Welcome to your new book! This is a Typst template to help you get started.

#heading(numbering: none)[Introduction]
Write your introduction here.

// Include your chapters here
#include "chapters/chapter01.typ"
// #include "chapters/chapter02.typ"
