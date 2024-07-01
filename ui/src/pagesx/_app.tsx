import ReactQueryProvider from "@/providers/ReactQueryProvider";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <ReactQueryProvider >
        <h1>Foo</h1>
        <Component {...pageProps} />
      </ReactQueryProvider>
    </>
  )
}
