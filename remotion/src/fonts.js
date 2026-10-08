// Caption-friendly Google Fonts. Loaded lazily + cached the first time a family
// is actually used (loading them all up-front times out the delayRender budget).
//
// The extra families are the Google equivalents of the ones the reference
// editors use — their own font FILES aren't redistributable, so each is mapped
// to the closest free Google face (Futura->Archivo Black, TheBoldFont->Archivo
// Black, KomikaAxis->Bangers, MonaSans->Manrope, HelveticaNeue->Inter, ...).
import { loadFont as Montserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as Poppins } from "@remotion/google-fonts/Poppins";
import { loadFont as Inter } from "@remotion/google-fonts/Inter";
import { loadFont as Anton } from "@remotion/google-fonts/Anton";
import { loadFont as BebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as ArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as Oswald } from "@remotion/google-fonts/Oswald";
import { loadFont as Rubik } from "@remotion/google-fonts/Rubik";
import { loadFont as Bangers } from "@remotion/google-fonts/Bangers";
import { loadFont as Roboto } from "@remotion/google-fonts/Roboto";
import { loadFont as RobotoCondensed } from "@remotion/google-fonts/RobotoCondensed";
import { loadFont as BarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as Nunito } from "@remotion/google-fonts/Nunito";
import { loadFont as Outfit } from "@remotion/google-fonts/Outfit";
import { loadFont as Kanit } from "@remotion/google-fonts/Kanit";
import { loadFont as Lato } from "@remotion/google-fonts/Lato";
import { loadFont as LuckiestGuy } from "@remotion/google-fonts/LuckiestGuy";
import { loadFont as Fredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as TitanOne } from "@remotion/google-fonts/TitanOne";
import { loadFont as InstrumentSans } from "@remotion/google-fonts/InstrumentSans";
import { loadFont as InstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as Michroma } from "@remotion/google-fonts/Michroma";
import { loadFont as KaushanScript } from "@remotion/google-fonts/KaushanScript";
import { loadFont as Bitter } from "@remotion/google-fonts/Bitter";
import { loadFont as PressStart2P } from "@remotion/google-fonts/PressStart2P";
import { loadFont as LobsterTwo } from "@remotion/google-fonts/LobsterTwo";
import { loadFont as Manrope } from "@remotion/google-fonts/Manrope";
import { loadFont as Teko } from "@remotion/google-fonts/Teko";
import { loadFont as Chivo } from "@remotion/google-fonts/Chivo";
import { loadFont as Sora } from "@remotion/google-fonts/Sora";
import { loadFont as Syne } from "@remotion/google-fonts/Syne";

const multi = { weights: ["400", "700", "800"], subsets: ["latin"], ignoreTooManyRequestsWarning: true };
const single = { subsets: ["latin"], ignoreTooManyRequestsWarning: true };
const italic = { weights: ["400"], subsets: ["latin"], ignoreTooManyRequestsWarning: true };

const LOADERS = {
  Montserrat: () => Montserrat("normal", multi),
  Poppins: () => Poppins("normal", multi),
  Inter: () => Inter("normal", multi),
  Anton: () => Anton("normal", single),
  "Bebas Neue": () => BebasNeue("normal", single),
  "Archivo Black": () => ArchivoBlack("normal", single),
  Oswald: () => Oswald("normal", multi),
  Rubik: () => Rubik("normal", multi),
  Bangers: () => Bangers("normal", single),
  Roboto: () => Roboto("normal", multi),
  "Roboto Condensed": () => RobotoCondensed("normal", multi),
  "Barlow Condensed": () => BarlowCondensed("normal", multi),
  Nunito: () => Nunito("normal", multi),
  Outfit: () => Outfit("normal", multi),
  Kanit: () => Kanit("normal", multi),
  Lato: () => Lato("normal", multi),
  "Luckiest Guy": () => LuckiestGuy("normal", single),
  Fredoka: () => Fredoka("normal", multi),
  "Titan One": () => TitanOne("normal", single),
  "Instrument Sans": () => InstrumentSans("normal", multi),
  "Instrument Serif": () => InstrumentSerif("italic", italic),
  Michroma: () => Michroma("normal", single),
  "Kaushan Script": () => KaushanScript("normal", single),
  Bitter: () => Bitter("normal", multi),
  "Press Start 2P": () => PressStart2P("normal", single),
  "Lobster Two": () => LobsterTwo("italic", italic),
  Manrope: () => Manrope("normal", multi),
  Teko: () => Teko("normal", multi),
  Chivo: () => Chivo("normal", multi),
  Sora: () => Sora("normal", multi),
  Syne: () => Syne("normal", multi),
};

export const FONT_NAMES = Object.keys(LOADERS);

const cache = {};
export const fontFamily = (name) => {
  const key = LOADERS[name] ? name : "Montserrat";
  if (!cache[key]) {
    try { cache[key] = LOADERS[key]().fontFamily; }
    catch { cache[key] = key; }
  }
  return cache[key];
};
