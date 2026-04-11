import { Component } from 'react'

/**
 * Catches render errors in heavy dashboard sections (e.g. Recharts) so the rest of the page still shows.
 */
export default class SectionErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error(this.props.logLabel || 'Section error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-amber-900">
            {this.props.title || 'This section could not be displayed'}
          </p>
          <p className="mt-2 text-xs text-amber-800/90">
            Open the browser developer console (F12) for details. Other dashboard areas should still work.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
