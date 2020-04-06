import React from 'react'
import H, { Location } from 'history'
import { Logger, noopLogger } from 'typescript-log'
import { useLocation } from 'react-router'

export interface PageLifecycleEvent<T> {
    type: string
    timeStamp: number
    originator: string
    payload: T
}
export declare interface Properties {
    location: H.Location
    [key: string]: any
}
export interface PageLoadStarted extends PageLifecycleEvent<Properties> {
    type: 'page-load-started'
}

export interface PageLoadFailed
    extends PageLifecycleEvent<Properties & { error: string }> {
    type: 'page-load-failed'
}

export interface PageLoadComplete extends PageLifecycleEvent<Properties> {
    type: 'page-load-complete'
}

export type PageEvent = PageLoadStarted | PageLoadFailed | PageLoadComplete

export interface PageLifecycleProviderRenderProps {
    /** Increments loading count */
    beginLoadingData: () => void
    /** Decrements loading count */
    endLoadingData: () => void
}

export interface PageLifecycleProviderProps {
    children:
        | React.ReactElement<any>
        | ((
              pageProps: PageLifecycleProviderRenderProps,
          ) => React.ReactElement<any>)
    onEvent: (event: PageEvent) => void
    logger?: Logger
}

export interface PageProperties extends PageLifecycleProviderRenderProps {
    currentPageProps: Array<React.MutableRefObject<{}>>
}
export const PagePropertiesContext = React.createContext<PageProperties>(
    undefined as any,
)

export const PageLifecycleProvider: React.FC<PageLifecycleProviderProps> = ({
    children,
    onEvent,
    logger = noopLogger(),
}) => {
    // This will work assuming this component updates before children using the same hook
    const location = useLocation()
    const locationRef = React.useRef(location)
    locationRef.current = location
    const previousLocation = usePrevious(location)
    // This needs to be outside of React's lifecycle so it's immediately consistent
    const loadingDataCount = React.useRef(0)
    // Set to true when location changes, set to false again when update is complete
    const isRouting = React.useRef(true)

    // This needs to be outside React's lifecycle because we want these props to be immediately
    // consistent as it can be updated through context, then we raise events using the latest value
    // If it was stored in React state, it would be out of date
    const contextValue = React.useMemo<PageProperties>(
        () => ({
            currentPageProps: [],
            beginLoadingData,
            endLoadingData,
            currentPageLocation: location,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    // While routing our state may be inconsistent
    if (previousLocation && !isRouting.current) {
        // We only care about pathname, not any of the other location info
        if (previousLocation !== location) {
            if (logger) {
                logger.debug(
                    {
                        oldPath: previousLocation.pathname,
                        newPath: location.pathname,
                    },
                    'Path changed',
                )
            }

            isRouting.current = true
        }
    }

    React.useEffect(() => {
        if (!isRouting.current) {
            return
        }

        raisePageLoadStartEvent(
            logger,
            onEvent,
            contextValue.currentPageProps,
            location,
        )
        // No data load triggered, also raise complete event
        if (loadingDataCount.current === 0) {
            raisePageLoadCompleteEvent(
                logger,
                onEvent,
                contextValue.currentPageProps,
                location,
            )
            isRouting.current = false
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, isRouting.current])

    function beginLoadingData() {
        loadingDataCount.current++
        logger.debug(
            { loadingDataCount: loadingDataCount.current },
            'Begin loading data',
        )
    }

    function endLoadingData() {
        loadingDataCount.current--
        logger.debug(
            { loadingDataCount: loadingDataCount.current },
            'End loading data',
        )

        // If pages load data after the page has transitioned to complete, just ignore it
        if (loadingDataCount.current === 0 && isRouting.current) {
            raisePageLoadCompleteEvent(
                logger,
                onEvent,
                contextValue.currentPageProps,
                locationRef.current,
            )
            isRouting.current = false
        }
    }

    if (typeof children === 'function') {
        return (
            <PagePropertiesContext.Provider value={contextValue}>
                {children({
                    beginLoadingData,
                    endLoadingData,
                })}
            </PagePropertiesContext.Provider>
        )
    }

    return (
        <PagePropertiesContext.Provider value={contextValue}>
            {React.Children.only(children)}
        </PagePropertiesContext.Provider>
    )
}

PageLifecycleProvider.displayName = 'PageLifecycleProvider'

function usePrevious<T>(value: T) {
    // The ref object is a generic container whose current property is mutable ...
    // ... and can hold any value, similar to an instance property on a class
    const ref = React.useRef<T>()

    // Store current value in ref
    React.useEffect(() => {
        ref.current = value
    }, [value]) // Only re-run if value changes

    // Return previous value (happens before update in useEffect above)
    return ref.current
}

function raisePageLoadStartEvent(
    logger: Logger,
    onEvent: (event: PageEvent) => void,
    currentPageProps: Array<React.MutableRefObject<{}>>,
    location: Location,
) {
    logger.debug({}, 'Rasing start load event')

    onEvent({
        type: 'page-load-started',
        originator: 'PageEvents',
        payload: {
            ...currentPageProps.reduce(
                (acc, val) => ({ ...acc, ...val.current }),
                {},
            ),
            location,
        },
        timeStamp: new Date().getTime(),
    })
}

function raisePageLoadCompleteEvent(
    logger: Logger,
    onEvent: (event: PageEvent) => void,
    currentPageProps: Array<React.MutableRefObject<{}>>,
    location: Location,
) {
    const reducedProps = currentPageProps.reduce(
        (acc, val) => ({ ...acc, ...val.current }),
        {},
    )

    logger.debug(
        { currentPageProps: reducedProps },
        'Raising page load complete event',
    )

    onEvent({
        type: 'page-load-complete',
        originator: 'PageEvents',
        payload: {
            ...reducedProps,
            location,
        },
        timeStamp: new Date().getTime(),
    })
}
