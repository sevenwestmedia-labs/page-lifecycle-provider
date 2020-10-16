/**
 * @jest-environment jsdom
 */

window.requestAnimationFrame = (callback: any) => {
    return setTimeout(callback, 0) as any
}

import H from 'history'
import React from 'react'
import { act } from 'react-dom/test-utils'
import Adapter from 'enzyme-adapter-react-16'
import { MemoryRouter, Route } from 'react-router-dom'
import { mount, configure } from 'enzyme'

import { PromiseCompletionSource } from 'promise-completion-source'
import {
    PageEvent,
    PageLifecycleProvider,
    PagePropertiesContext,
} from '../src/PageLifecycleProvider'
import { PageProps } from '../src/PageProps'

configure({ adapter: new Adapter() })

interface TestData {
    bar: string
}

const createTestComponents = (asyncCompletion = true) => {
    const promiseCompletionSource = new PromiseCompletionSource<TestData>()
    let loadTriggered = false
    const TestPage: React.FC<{ extraProps?: object }> = ({ extraProps }) => {
        return (
            <PageProps pageProperties={extraProps}>
                {(pageProps) => {
                    // This emulates a component under the page starting to load data
                    // then completing once the promise completion source completes
                    if (!loadTriggered) {
                        pageProps.beginLoadingData()

                        loadTriggered = true
                        if (asyncCompletion) {
                            promiseCompletionSource.promise.then(() =>
                                pageProps.endLoadingData(),
                            )
                        } else {
                            pageProps.endLoadingData()
                        }
                    }

                    return null
                }}
            </PageProps>
        )
    }

    return {
        promiseCompletionSource,
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
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <testComponents.TestPage />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        wrapper.find(testComponents.TestPage)

        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })

    it('raises start event before complete ', () => {
        const testComponents = createTestComponents(false)
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <testComponents.TestPage />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        wrapper.find(testComponents.TestPage)

        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
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
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <Route
                        render={(props) => {
                            history = props.history
                            return (
                                <div>
                                    {props.location.pathname === '/' && (
                                        <PageProps
                                            pageProperties={{
                                                pageExtra:
                                                    'Some extra page data',
                                            }}
                                        />
                                    )}
                                    <testComponents.TestPage
                                        extraProps={
                                            extraPropsLookup[
                                                props.location.pathname
                                            ]
                                        }
                                    />
                                </div>
                            )
                        }}
                    />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        if (!history) {
            throw new Error('History not defined')
        }

        act(() => {
            testComponents.promiseCompletionSource.resolve({ bar: 'test' })
        })
        await new Promise((resolve) => setTimeout(() => resolve()))
        testComponents.promiseCompletionSource = new PromiseCompletionSource()

        act(() => {
            history!.push('/foo')

            testComponents.promiseCompletionSource.resolve({ bar: 'page2' })
        })
        await new Promise((resolve) => setTimeout(() => resolve()))

        wrapper.update().find(testComponents.TestPage)
        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })

    it('raises completed event after data loaded and content re-rendered', async () => {
        const testComponents = createTestComponents()
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <testComponents.TestPage />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        act(() => {
            testComponents.promiseCompletionSource.resolve({
                bar: 'test',
            })
        })

        expect(pageEvents.length).toBe(1)
        await new Promise((resolve) => setTimeout(() => resolve()))
        wrapper.update().find(testComponents.TestPage)

        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })

    it('raises completed event after lazy loaded page has completed load data', async () => {
        const testComponents = createTestComponents()
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <testComponents.TestPage />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        wrapper.find(testComponents.TestPage)

        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()

        await new Promise((resolve) => setTimeout(() => resolve()))

        act(() => {
            testComponents.promiseCompletionSource.resolve({
                bar: 'test',
            })
        })
        // We should not have received the completed event yet
        expect(pageEvents.length).toBe(1)

        // Let the completion propagate
        await new Promise((resolve) => setTimeout(() => resolve()))
        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })

    it('raises events when page navigated', async () => {
        const testComponents = createTestComponents()
        let history: H.History | undefined
        const pageEvents: PageEvent[] = []

        const wrapper = mount(
            <MemoryRouter initialEntries={['/', '/foo']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <Route
                        render={(props) => {
                            history = props.history
                            return <testComponents.TestPage />
                        }}
                    />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        if (!history) {
            throw new Error('History not defined')
        }

        act(() => {
            testComponents.promiseCompletionSource.resolve({ bar: 'test' })
        })
        await new Promise((resolve) => setTimeout(() => resolve()))
        testComponents.promiseCompletionSource = new PromiseCompletionSource()

        act(() => {
            history!.push('/foo')
            testComponents.promiseCompletionSource.resolve({ bar: 'page2' })
        })
        await new Promise((resolve) => setTimeout(() => resolve()))
        wrapper.update().find(testComponents.TestPage)
        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })

    it('Does not raise events twice for a single route', async () => {
        const testComponents = createTestComponents()
        let history: H.History | undefined
        const pageEvents: PageEvent[] = []
        let triggerDataLoad: () => void | undefined
        let triggerDataLoadComplete: () => void | undefined

        const wrapper = mount(
            <MemoryRouter initialEntries={['/', '/foo']} initialIndex={0}>
                <PageLifecycleProvider
                    onEvent={(event) => pageEvents.push(event)}
                >
                    <Route
                        render={(props) => {
                            history = props.history
                            return (
                                <div>
                                    <testComponents.TestPage />
                                    <PageProps>
                                        {(pageProps) => {
                                            triggerDataLoad =
                                                pageProps.beginLoadingData
                                            triggerDataLoadComplete =
                                                pageProps.endLoadingData

                                            return null
                                        }}
                                    </PageProps>
                                </div>
                            )
                        }}
                    />
                </PageLifecycleProvider>
            </MemoryRouter>,
        )

        if (!history) {
            throw new Error('History not defined')
        }

        act(() => {
            testComponents.promiseCompletionSource.resolve({ bar: 'test' })
        })
        await new Promise((resolve) => setTimeout(() => resolve()))

        act(() => {
            triggerDataLoad!()
            triggerDataLoadComplete!()
        })

        expect(
            pageEvents.map((e) => {
                e.timeStamp = 0
                if (e.payload && e.payload.location) {
                    e.payload.location.key = '...'
                }
                return e
            }),
        ).toMatchSnapshot()
    })
})
