import { createTheme } from "baseui";
import { Client, Server } from "styletron-engine-atomic";

const getHydrateClass = (): HTMLCollectionOf<HTMLStyleElement> =>
  document.getElementsByClassName(
    "_styletron_hydrate_"
  ) as HTMLCollectionOf<HTMLStyleElement>;

export const styletron =
  typeof window === "undefined"
    ? new Server()
    : new Client({
        hydrate: getHydrateClass(),
      });

export const theme = createTheme({
  primaryFontFamily: "Manrope",
});
