import * as React from 'react'
import * as PropTypes from 'prop-types'
import { PageLifecycle } from './PageLifecycle'
import { PageLifecycleProps } from './withPageLifecycle'
import { Logger } from './util/log'

export interface Props {
    pageProperties?: object
}

export class PageAdditionalProps extends React.Component<Props, {}> {
    static displayName = 'PageAdditionalProps'

    static contextTypes = {
        // Seems like context cannot be exported, this is a runtime react thing anyways
        pageLifecycle: PropTypes.object as any,
    }

    // @ts-ignore
    context: {
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

    componentWillReceiveProps(nextProps: Props & PageLifecycleProps) {
        this.context.pageLifecycle.updatePageProps(nextProps.pageProperties || {})
    }

    render() {
        return this.props.children ? React.Children.only(this.props.children) : null
    }
}
