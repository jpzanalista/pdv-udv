import { formatBRL } from '@pdv-udv/core'

export default function Home() {
  return (
    <main style={{ padding: '3rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>PDV UDV</h1>
      <p>Frente de caixa dos empórios da União do Vegetal.</p>
      <p style={{ opacity: 0.7 }}>
        Scaffolding inicial — exemplo de regra compartilhada do <code>@pdv-udv/core</code>:{' '}
        <strong>{formatBRL(7900)}</strong>
      </p>
      <ul style={{ opacity: 0.7, lineHeight: 1.8 }}>
        <li>Próximo: tela de login (Cognito staff / OTP sócio)</li>
        <li>Depois: caixa (identificação → carrinho → pagamento)</li>
      </ul>
    </main>
  )
}
