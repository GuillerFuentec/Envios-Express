import "../styles/globals.css";
import { ReCaptchaProvider } from "../components/ReCaptchaProvider";

export default function App({ Component, pageProps }) {
  return (
    <ReCaptchaProvider>
      <Component {...pageProps} />
    </ReCaptchaProvider>
  );
}
