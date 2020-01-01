# Page LifeCycle Provider

The page lifecycle provider introduces a concept of page lifecycles to route changes. The useful scenario is to raise an event when navigations happen (easy using react-router already), then raise another event once all the data has been loaded for that route (harder).

## Usage

Render `PageLifecycleProvider` between React-Router Router and the routes of your application.

```ts
const App: React.SFC<{}> = () => (
    <BrowserRouter>
        <PageLifecycleProvider onEvent={(event) => { console.log(event) }}
            <Main />
        </PageLifecycleProvider>
    </BrowserRouter>
)
```

`onEvent` will then raise page-load-started and page-load-complete events.

## Data Loading

Add `loading` and `loaded` props to your component which loads data

```ts
const ComponentWhichLoadsData = () => {
    const pageProps = React.useContext(PagePropertiesContext)

    const [data, setData] = React.useState()

    React.useEffect(() => {
        pageProps.beginLoadingData()
        getData().then(loadedData => {
            setData(loadedData)
            pageProps.endLoadingData()
        })
    })

    return data ? <RenderData data={data}> : 'Loading...'
}
```

The `PageLifecycleProvider` also can be used instead of the context if you have a way to globally know when data is being loaded.

```ts
const App = () => (
    <BrowserRouter>
        <PageLifecycleProvider>
            {({ beginLoadingData, endLoadingData }) => (
                <DataLoader
                    onBeginLoadData={beginLoadingData}
                    onEndLoadData={endLoadingData}
                >
                    <Main />
                </DataLoader>
            )}
        </PageLifecycleProvider>
    </BrowserRouter>
)
```

## Adding properties to the payload

Often you want extra data in your events, you can do this with the `PageProps` component

```ts
const ComponentWhichLoadsData = () => {
    const pageProps = React.useContext(PagePropertiesContext)

    const [data, setData] = React.useState()

    React.useEffect(() => {
        pageProps.beginLoadingData()
        getData().then(loadedData => {
            setData(loadedData)
            pageProps.endLoadingData()
        })
    })

    return data ? <PageProps pageProperties={{ extra: 'value' }}><RenderData data={data}></PageProps> : 'Loading...'
}
```

Now the events will have `{ payload: { extra: 'value' }}`. Multiple page props will be merged together.

## API

### PageEvents

Page events are:

```ts
export interface PageLoadStarted {
    type: 'page-load-started'
    timeStamp: number
    originator: string
    payload: {
        [key: string]: any
    }
}

export interface PageLoadFailed {
    type: 'page-load-failed'
    timeStamp: number
    originator: string
    payload: {
        error: string
        [key: string]: any
    }
}

export interface PageLoadComplete {
    type: 'page-load-complete'
    timeStamp: number
    originator: string
    payload: {
        [key: string]: any
    }
}
```
