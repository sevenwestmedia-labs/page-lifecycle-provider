import React, { Fragment } from 'react'
import {
    PagePropertiesContext,
    PageLifecycleProviderRenderProps,
} from './PageLifecycleProvider'

export interface Props {
    pageProperties?: {}
    children?:
        | null
        | React.ReactElement<any>
        | ((
              pageProps: PageLifecycleProviderRenderProps,
          ) => React.ReactElement<any> | null)
}

export const PageProps: React.FC<Props> = ({ pageProperties, children }) => {
    const pagePropsRef = React.useRef(pageProperties || {})
    pagePropsRef.current = pageProperties || {}
    const pageProps = React.useContext(PagePropertiesContext)

    if (pageProps.currentPageProps.indexOf(pagePropsRef) === -1) {
        pageProps.currentPageProps.push(pagePropsRef)
    }

    React.useEffect(() => {
        return () => {
            // On unmount, delete the props
            pageProps.currentPageProps.splice(
                pageProps.currentPageProps.indexOf(pagePropsRef),
                1,
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (typeof children === 'function') {
        return (
            <Fragment>
                {children({
                    beginLoadingData: pageProps.beginLoadingData,
                    endLoadingData: pageProps.endLoadingData,
                })}
            </Fragment>
        )
    }

    if (children) {
        return <Fragment>{children}</Fragment>
    }

    return null
}

PageProps.displayName = 'PageProps'
