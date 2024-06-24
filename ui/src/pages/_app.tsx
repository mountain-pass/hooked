import "@/styles/globals.css";
import ReactQueryProvider from "@/utils/providers/ReactQueryProvider";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ReactQueryProvider>
      <Component {...pageProps} />
    </ReactQueryProvider>
  )
}