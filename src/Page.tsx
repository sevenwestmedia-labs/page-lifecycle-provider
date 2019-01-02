import React from 'react'
import { PageLifecycleContext, ensureContext } from './PageLifecycle'
import { PageLifecycleProps, withPageLifecycleProps } from './withPageLifecycle'

export interface Props {
    page: React.ReactElement<any> | ((pageProps: PageLifecycleProps) => React.ReactElement<any>)
    pageProperties?: object
}

export const Page = withPageLifecycleProps(
    // tslint:disable-next-line:no-shadowed-variable
    class Page extends React.Component<Props & PageLifecycleProps, {}> {
        static displayName = `Page`

        static contextType = PageLifecycleContext

        context!: React.ContextType<typeof PageLifecycleContext>

        constructor(
            props: Props & PageLifecycleProps,
            context: React.ContextType<typeof PageLifecycleContext>,
        ) {
            super(props, context)

            ensureContext(context).updatePageProps(this.props.pageProperties || {})
        }

        componentDidMount() {
            ensureContext(this.context).pageRenderComplete()
        }

        componentDidUpdate() {
            ensureContext(this.context).updatePageProps(this.props.pageProperties || {})
            ensureContext(this.context).pageRenderComplete()
        }

        render() {
            let content: React.ReactElement<any> | undefined

            if (typeof this.props.page === 'function') {
                content = this.props.page({
                    currentPageState: this.props.currentPageState,
                    currentPageLocation: this.props.currentPageLocation,
                    beginLoadingData: this.props.beginLoadingData,
                    endLoadingData: this.props.endLoadingData,
                })
            } else {
                content = this.props.page
            }

            return content
        }
    },
)
