"use strict";

import Head from "next/head";
import Nav from "../components/home/Nav";
import Hero from "../components/home/Hero";
import Highlights from "../components/home/Highlights";
import Process from "../components/home/Process";
import About from "../components/home/About";
import Location from "../components/home/Location";
import FAQ from "../components/home/FAQ";
import Contact from "../components/home/Contact";
import Footer from "../components/home/Footer";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Paqueteria Caribena Express - Envios a Cuba</title>
        <meta
          name="description"
          content="Envios a Cuba facil: paga por libra, recogida opcional, entrega en 48-72h."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Nav />
      <Hero />
      <Highlights />
      <Process />
      <About />
      <Location />
      <FAQ />
      <Contact />
      <Footer />
    </>
  );
}
