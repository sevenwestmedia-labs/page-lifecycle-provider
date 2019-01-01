/**
 * @jest-environment jsdom
 */

window.requestAnimationFrame = (callback: any) => {
    return setTimeout(callback, 0) as any
}

import * as React from 'react'
import { MemoryRouter, Route } from 'react-router-dom'
import { mount, configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import * as H from 'history'
import { PromiseCompletionSource } from './promise-completion-source'
import { Page } from '../src/Page'
import { PageEvent, PageLifecycleProvider } from '../src/PageLifecycleProvider'
import { PageAdditionalProps } from '../src/PageAdditionalProps'
import { PageLifecycleContext, ensureContext } from '../src/PageLifecycle'

configure({ adapter: new Adapter() })

interface TestData {
    bar: string
}

const createTestComponents = () => {
    const promiseCompletionSource = new PromiseCompletionSource<TestData>()
    class TestPage extends React.Component<{ path: string; extraProps?: object }, {}> {
        loadTriggered = false

        render() {
            return (
                <Page
                    pageProperties={this.props.extraProps}
                    page={pageProps => {
                        // This emulates a component under the page starting to load data
                        // then completing once the promise completion source completes
                        if (!this.loadTriggered) {
                            pageProps.beginLoadingData()
                            this.loadTriggered = true
                            promiseCompletionSource.promise.then(() => pageProps.endLoadingData())
                        }
                        return (
                            <div>
                                Page location: {pageProps.currentPageLocation.pathname}
                                Page state: {pageProps.currentPageState}
                            </div>
                        )
                    }}
                />
            )
        }
    }

    // tslint:disable-next-line:max-classes-per-file
    class FakeLazyLoad extends React.Component<{ path: string }, { loaded: boolean }> {
        state = { loaded: false }
        static contextType = PageLifecycleContext
        context!: React.ContextType<typeof PageLifecycleContext>

        componentDidMount() {
            ensureContext(this.context).beginLoadingData()
            // When we mount, pretend we are starting to load the test page
            setTimeout(() => {
                this.setState(
                    { loaded: true },
                    // Only end load data after state change has been applied
                    // Because this could trigger more loading of data
                    ensureContext(this.context).endLoadingData,
                )
            })
        }

        render() {
            return this.state.loaded ? <TestPage {...this.props} /> : <noscript />
        }
    }

    return {
        promiseCompletionSource,
        FakeLazyLoad,
        TestPage,
    }
}

describe('PageLifecycleProvider', () => {
    it('raises loading event after render', () => {
        const testComponents = createTestComponents()
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={event => pageEvents.push(event)}
                    render={<testComponents.TestPage path="/" />}
                />
            </MemoryRouter>,
        )

        const testPage = wrapper.find(testComponents.TestPage)

        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
        expect(testPage.debug()).toMatchSnapshot()
    })

    it('can pass extra data to pages', async () => {
        const testComponents = createTestComponents()
        let history: H.History | undefined
        const pageEvents: PageEvent[] = []
        const extraPropsLookup: { [path: string]: object } = {
            '/': { home: 'isHome' },
            '/foo': { foo: 'isFoo' },
        }

        const wrapper = mount(
            <MemoryRouter initialEntries={['/', '/foo']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={event => pageEvents.push(event)}
                    render={
                        <Route
                            render={props => {
                                history = props.history
                                return (
                                    <div>
                                        {props.location.pathname === '/' && (
                                            <PageAdditionalProps
                                                pageProperties={{
                                                    pageExtra: 'Some extra page data',
                                                }}
                                            />
                                        )}
                                        <testComponents.TestPage
                                            path={props.location.pathname}
                                            extraProps={extraPropsLookup[props.location.pathname]}
                                        />
                                    </div>
                                )
                            }}
                        />
                    }
                />
            </MemoryRouter>,
        )

        if (!history) {
            throw new Error('History not defined')
        }

        testComponents.promiseCompletionSource.resolve({ bar: 'test' })
        await new Promise(resolve => setTimeout(() => resolve()))
        testComponents.promiseCompletionSource.reset()

        history.push('/foo')

        testComponents.promiseCompletionSource.resolve({ bar: 'page2' })
        await new Promise(resolve => setTimeout(() => resolve()))

        const testPage = wrapper.update().find(testComponents.TestPage)
        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
        expect(testPage.debug()).toMatchSnapshot()
    })

    it('raises completed event after data loaded and content re-rendered', async () => {
        const testComponents = createTestComponents()
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={event => pageEvents.push(event)}
                    render={<testComponents.TestPage path="/" />}
                />
            </MemoryRouter>,
        )

        testComponents.promiseCompletionSource.resolve({
            bar: 'test',
        })

        expect(pageEvents.length).toBe(1)
        await new Promise(resolve => setTimeout(() => resolve()))
        const testPage = wrapper.update().find(testComponents.TestPage)

        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()

        expect(testPage.debug()).toMatchSnapshot()
    })

    it('raises completed event after lazy loaded page has completed load data', async () => {
        const testComponents = createTestComponents()
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={event => pageEvents.push(event)}
                    render={<Page page={<testComponents.FakeLazyLoad path="/" />} />}
                />
            </MemoryRouter>,
        )

        const testPage = wrapper.find(testComponents.TestPage)

        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
        expect(testPage.debug()).toMatchSnapshot()
        await new Promise(resolve => setTimeout(() => resolve()))

        testComponents.promiseCompletionSource.resolve({
            bar: 'test',
        })
        // We should not have received the completed event yet
        expect(pageEvents.length).toBe(1)

        // Let the completion propagate
        await new Promise(resolve => setTimeout(() => resolve()))
        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
        expect(testPage.debug()).toMatchSnapshot()
    })

    it('raises events when page navigated', async () => {
        const testComponents = createTestComponents()
        let history: H.History | undefined
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/', '/foo']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={event => pageEvents.push(event)}
                    render={
                        <Route
                            render={props => {
                                history = props.history
                                return <testComponents.TestPage path={props.location.pathname} />
                            }}
                        />
                    }
                />
            </MemoryRouter>,
        )

        if (!history) {
            throw new Error('History not defined')
        }

        testComponents.promiseCompletionSource.resolve({ bar: 'test' })
        await new Promise(resolve => setTimeout(() => resolve()))
        testComponents.promiseCompletionSource.reset()

        history.push('/foo')

        testComponents.promiseCompletionSource.resolve({ bar: 'page2' })
        await new Promise(resolve => setTimeout(() => resolve()))
        const testPage = wrapper.update().find(testComponents.TestPage)
        expect(
            pageEvents.map(e => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
        expect(testPage.debug()).toMatchSnapshot()
    })
})
