import * as React from 'react'
import * as PropTypes from 'prop-types'
import * as H from 'history'

import { PageLifecycleProviderRenderProps } from './PageLifecycleProvider'
import { PageLifecycle, PageLifecycleContext, ensureContext } from './PageLifecycle'
import { getDisplayName } from './util/get-display-name'

export type LifecycleComponent<T> =
    | React.ComponentClass<PageLifecycleProps & T>
    | React.SFC<PageLifecycleProps & T>

export type LoadingStates = 'loading' | 'loaded'

export type LifecycleState = {
    currentPageState: LoadingStates
    currentPageLocation: H.Location
}
export type PageLifecycleProps = LifecycleState & PageLifecycleProviderRenderProps

export type StateChangeCallback = (state: LifecycleState) => void
export type RouteChangeCallback = (location: H.Location) => void

export function withPageLifecycleProps<T>(
    Component: LifecycleComponent<T>,
): React.ComponentClass<T> {
    return class WithPageLifecycleProps extends React.Component<T, LifecycleState> {
        static displayName = `withPageLifecycleProps(${getDisplayName(Component)})`

        static contextType = PageLifecycleContext

        context!: React.ContextType<typeof PageLifecycleContext>

        state: LifecycleState

        constructor(props: T, context: React.ContextType<typeof PageLifecycleContext>) {
            super(props, context)

            this.state = {
                currentPageState: ensureContext(context).currentPageState,
                currentPageLocation: ensureContext(context).currentPageLocation,
            }
        }

        componentDidMount() {
            ensureContext(this.context).onPageStateChanged(this.pageStateChanged)
        }

        componentWillUnmount() {
            ensureContext(this.context).offPageStateChanged(this.pageStateChanged)
        }

        pageStateChanged = (pageState: LifecycleState) => {
            ensureContext(this.context).logger.debug(
                {
                    currentPageState: pageState.currentPageState,
                    currentPageLocation: pageState.currentPageLocation,
                },
                'Setting pageState on WithPageLifecycle',
            )
            this.setState(pageState)
        }

        render() {
            const context = ensureContext(this.context)

            return (
                <Component
                    {...this.props}
                    currentPageState={this.state.currentPageState}
                    currentPageLocation={this.state.currentPageLocation}
                    beginLoadingData={context.beginLoadingData}
                    endLoadingData={context.endLoadingData}
                />
            )
        }
    }
}
