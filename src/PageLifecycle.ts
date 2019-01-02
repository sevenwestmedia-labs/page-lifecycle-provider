import React from 'react'
import H from 'history'
import { PageLifecycleProviderRenderProps } from './PageLifecycleProvider'
import {
    PageLifecycleProps,
    StateChangeCallback,
    RouteChangeCallback,
    LoadingStates,
    LifecycleState,
} from './withPageLifecycle'
import { Logger } from 'typescript-log'

export const PageLifecycleContext = React.createContext<PageLifecycle | undefined>(undefined)

export function ensureContext(context: PageLifecycle | undefined): PageLifecycle {
    if (!context) {
        throw new Error(
            'Page lifecycle provider context missing, ensure you have wrapped your application in a PageLifecycleProvider',
        )
    }

    return context
}

export class PageLifecycle implements PageLifecycleProps, PageLifecycleProviderRenderProps {
    static displayName = 'PageLifecycle'

    /** Adds data to the page */
    updatePageProps: (props: object) => void
    pageRenderComplete: () => void
    /** Increment loading count */
    beginLoadingData: () => void
    /** Decrement loading count */
    endLoadingData: () => void
    stateChangedListeners: StateChangeCallback[] = []
    routeChangedListeners: RouteChangeCallback[] = []

    constructor(
        updatePageProps: (props: object) => void,
        onPageRender: () => void,
        beginLoadingData: () => void,
        endLoadingData: () => void,
        public currentPageState: LoadingStates,
        public currentPageLocation: H.Location,
        public logger: Logger,
    ) {
        this.updatePageProps = updatePageProps
        this.pageRenderComplete = onPageRender
        this.beginLoadingData = beginLoadingData
        this.endLoadingData = endLoadingData
    }

    pageStateChanged = (state: LifecycleState) => {
        for (const listener of this.stateChangedListeners) {
            listener(state)
        }
    }

    routeChanged = (newLocation: H.Location) => {
        for (const listener of this.routeChangedListeners) {
            listener(newLocation)
        }
    }

    onPageStateChanged = (stateChangeCallback: StateChangeCallback) => {
        this.stateChangedListeners.push(stateChangeCallback)
    }

    offPageStateChanged = (stateChangeCallback: StateChangeCallback) => {
        const listenerIndex = this.stateChangedListeners.indexOf(stateChangeCallback)
        if (listenerIndex !== -1) {
            this.stateChangedListeners.splice(listenerIndex, 1)
        }
    }

    onRouteChanged = (routeChangeCallback: RouteChangeCallback) => {
        this.routeChangedListeners.push(routeChangeCallback)
    }

    offRouteChanged = (routeChangeCallback: RouteChangeCallback) => {
        const listenerIndex = this.routeChangedListeners.indexOf(routeChangeCallback)
        if (listenerIndex !== -1) {
            this.routeChangedListeners.splice(listenerIndex, 1)
        }
    }
}
