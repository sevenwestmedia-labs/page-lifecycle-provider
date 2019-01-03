import React from 'react'
import { PageLifecycleContext, ensureContext } from './PageLifecycle'
import { PageLifecycleProps } from './withPageLifecycle'

export interface Props {
    pageProperties?: object
}

export class PageAdditionalProps extends React.Component<Props, {}> {
    static displayName = 'PageAdditionalProps'

    static contextType = PageLifecycleContext

    context!: React.ContextType<typeof PageLifecycleContext>

    constructor(
        props: Props & PageLifecycleProps,
        context: React.ContextType<typeof PageLifecycleContext>,
    ) {
        super(props, context)

        ensureContext(context).updatePageProps(this.props.pageProperties || {})
    }

    componentDidUpdate() {
        ensureContext(this.context).updatePageProps(
            this.props.pageProperties || {},
        )
        return true
    }

    render() {
        return this.props.children
            ? React.Children.only(this.props.children)
            : null
    }
}
