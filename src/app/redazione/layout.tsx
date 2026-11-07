/** Area redazione: sfondo di buckled.it/reviews e tema scuro per tutte le pagine. */
export default function RedazioneLayout({ children }: LayoutProps<"/redazione">) {
  return <div className="redazione-bg dark flex flex-1 flex-col">{children}</div>;
}
