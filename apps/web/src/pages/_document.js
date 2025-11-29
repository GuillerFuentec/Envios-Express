"use strict";

import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="es">
        <Head>
          {/* Evita que iOS Safari auto-detecte tel/email/direcciones y genere links que interfieran con los taps */}
          <meta name="format-detection" content="telephone=no,email=no,address=no" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
