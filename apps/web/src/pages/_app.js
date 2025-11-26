import "../styles/globals.css";
import "../css/styles.css";
import "../css/navbar.css";
import "../css/footer.css";
import { ReCaptchaProvider } from "../components/ReCaptchaProvider";

export default function App({ Component, pageProps }) {
  return (
    <ReCaptchaProvider>
      <Component {...pageProps} />
    </ReCaptchaProvider>
  );
}
