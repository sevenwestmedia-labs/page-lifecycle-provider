import * as React from 'react'
import * as PropTypes from 'prop-types'
import { PageLifecycle } from './PageLifecycle'
import {
    PageLifecycleProps,
    withPageLifecycleProps,
} from './withPageLifecycle'
import { Logger } from './util/log';

export interface Props {
    page: React.ReactElement<any> | ((pageProps: PageLifecycleProps) => React.ReactElement<any>)
    pageProperties?: object
}

export default withPageLifecycleProps(
    class Page extends React.PureComponent<Props & PageLifecycleProps, {}> {
        static displayName = `Page`

        static contextTypes = {
            // Seems like context cannot be exported, this is a runtime react thing anyways
            pageLifecycle: PropTypes.object,
            logger: PropTypes.object,
        }

        context!: {
            pageLifecycle: PageLifecycle
            logger: Logger
        }

        constructor(
            props: Props & PageLifecycleProps,
            context: {
                pageLifecycle: PageLifecycle
                logger: Logger
            },
        ) {
            super(props, context)

            context.pageLifecycle.updatePageProps(this.props.pageProperties || {})
        }

        componentDidMount() {
            this.context.pageLifecycle.pageRenderComplete()
        }

        componentWillReceiveProps(nextProps: Props & PageLifecycleProps) {
            this.context.pageLifecycle.updatePageProps(nextProps.pageProperties || {})
        }

        componentDidUpdate() {
            this.context.pageLifecycle.pageRenderComplete()
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