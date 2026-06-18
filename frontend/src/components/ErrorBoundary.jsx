import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erro inesperado na interface.' }
  }

  componentDidCatch(error) {
    console.error('UI crash:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Erro ao carregar a tela</h2>
          <p>{this.state.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
