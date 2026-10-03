import { PlayIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useLocalSources } from '@/api/local-sources'
import { usePanAccount } from '@/api/pan'
import { playableVideoUrl, usePlayables, type Playable, type PlayableKind } from '@/api/playables'
import { EmptyState } from '@/components/empty-state'
import { ErrorState, InlineError } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { PlayerStage, type PlayerInstance, type PlayerTrack } from './player-stage'

type SourceOption = {
  id: string
  label: string
  scope: PlayableKind
  directory: string
  disabled?: boolean
}

const ALL_LOCAL: SourceOption = { id: 'local:all', label: '本地（全部）', scope: 'local', directory: '' }

export function PlayerPage() {
  const sources = useLocalSources()
  const pan = usePanAccount()
  const [sourceID, setSourceID] = useState(ALL_LOCAL.id)
  const [current, setCurrent] = useState(-1)
  const playerRef = useRef<PlayerInstance | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const options = useMemo<SourceOption[]>(() => {
    const list: SourceOption[] = [ALL_LOCAL]
    for (const source of sources.data ?? []) {
      if (!source.enabled) continue
      list.push({ id: `local:${source.id}`, label: source.name, scope: 'local', directory: source.id })
    }
    if (pan.data?.connected && pan.data.directory) {
      list.push({ id: 'remote', label: `115 · ${pan.data.directory.name}`, scope: 'remote', directory: '' })
    }
    list.push({ id: 'favorite', label: '收藏', scope: 'favorite', directory: '', disabled: true })
    return list
  }, [sources.data, pan.data])

  const active = options.find(option => option.id === sourceID) ?? ALL_LOCAL
  const query = usePlayables(active.scope, active.directory)
  const {
    isPending,
    isError,
    isFetching,
    isRefetchError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = query
  const reload = () => void query.refetch()

  const items = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data])
  const tracks = useMemo<PlayerTrack[]>(
    () =>
      items.flatMap(item =>
        item.videos.map(video => ({
          url: playableVideoUrl(item.kind, video.file_id),
          name: video.name,
          code: item.code
        }))
      ),
    [items]
  )
  const movies = useMemo(() => {
    const result: { item: Playable; start: number; count: number }[] = []
    items.reduce((offset, item) => {
      result.push({ item, start: offset, count: item.videos.length })
      return offset + item.videos.length
    }, 0)
    return result
  }, [items])
  const activeMovie = movies.find(entry => current >= entry.start && current < entry.start + entry.count)

  useEffect(() => {
    playerRef.current?.setQueue(tracks)
  }, [tracks])

  useEffect(() => {
    const element = sentinelRef.current
    if (!element || !hasNextPage) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void fetchNextPage()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage, items.length])

  const play = (index: number) => {
    if (!tracks[index]) return
    playerRef.current?.setSources(tracks, index)
    setCurrent(index)
  }

  const playing = current >= 0 ? tracks[current] : undefined
  const partIndex = activeMovie ? current - activeMovie.start + 1 : 0
  const go = (delta: number) => {
    const next = current + delta
    if (next >= 0 && next < tracks.length) play(next)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[84rem] flex-col gap-5 bg-background px-4 pt-7 pb-24 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <header className="flex flex-none flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">播放</h1>
          <p className="mt-1 text-sm text-muted-foreground">选择一个来源，点击右侧目录即可播放</p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {active.label} · {tracks.length}
          {hasNextPage ? '+' : ''} 个文件
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <PlayerStage
            onReady={player => {
              playerRef.current = player
              player.setQueue(tracks)
            }}
            onChange={setCurrent}
            onEnded={(_index, hasNext) => {
              if (!hasNext && hasNextPage) void fetchNextPage()
            }}
          />

          <div className="flex min-w-0 items-center gap-3">
            {playing ? (
              <>
                <span className="flex-none rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {playing.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{playing.name}</span>
                {activeMovie && activeMovie.count > 1 ? (
                  <span className="flex-none text-xs text-muted-foreground tabular-nums">
                    第 {partIndex} / {activeMovie.count} 段
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">未播放</span>
            )}
            <div className="ml-auto flex flex-none gap-2">
              <Button variant="outline" size="sm" disabled={current <= 0} onClick={() => go(-1)}>
                上一段
              </Button>
              <Button size="sm" disabled={current < 0 || current + 1 >= tracks.length} onClick={() => go(1)}>
                下一段
              </Button>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 lg:h-full">
          <div className="flex-none border-b border-border/60 p-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">目录列表</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {tracks.length}
                {hasNextPage ? '+' : ''} 个文件
              </span>
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {options.map(option => (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    playerRef.current?.stop()
                    setCurrent(-1)
                    setSourceID(option.id)
                  }}
                  className={cn(
                    'h-7 flex-none rounded-full border px-2.5 text-xs whitespace-nowrap transition-colors',
                    option.id === sourceID
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                    option.disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
            ) : isError ? (
              <div className="p-2">
                <ErrorState message="无法读取播放列表" onRetry={reload} retrying={isFetching} />
              </div>
            ) : movies.length === 0 ? (
              <EmptyState className="py-10" title="这个来源还没有可播放的影片" />
            ) : (
              <>
                {isRefetchError ? (
                  <InlineError onRetry={reload} retrying={isFetching}>
                    刷新失败，请重试。
                  </InlineError>
                ) : null}
                {movies.map(entry => {
                  const isCurrent = activeMovie?.item.movie_id === entry.item.movie_id
                  return (
                    <button
                      key={entry.item.movie_id}
                      type="button"
                      onClick={() => play(entry.start)}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted',
                        isCurrent && 'bg-accent ring-1 ring-border/60'
                      )}
                    >
                      <span className="grid aspect-video w-16 flex-none place-items-center overflow-hidden rounded-lg bg-muted text-[0.6rem] text-muted-foreground ring-1 ring-border/60">
                        {entry.item.poster ? (
                          <img src={entry.item.poster} alt="" className="h-full w-full object-cover" />
                        ) : (
                          '封面'
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="flex-none rounded-full border border-border px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                            {entry.item.code}
                          </span>
                          <span className="min-w-0 truncate text-sm">{entry.item.title || entry.item.code}</span>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                          {entry.count > 1 ? `${entry.count} 段` : '1 段'}
                        </span>
                      </span>
                      <span className="flex flex-none items-center text-muted-foreground">
                        <PlayIcon className="size-4" />
                      </span>
                    </button>
                  )
                })}
                <div ref={sentinelRef} className="h-6" />
                {isFetchingNextPage ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">加载中…</p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
