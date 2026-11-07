import { useMemo, useState, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fetchProject, fetchTasks, updateTask } from './api'
import { TaskDialog } from './TaskDialog'
import { COLUMNS, PRIORITY_LABEL, PRIORITY_STYLE, type Status, type Task } from './types'

function Card({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const overdue = task.deadline && task.status !== 'done' && new Date(task.deadline) < new Date()
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e: KeyboardEvent) => {
        ;(listeners?.onKeyDown as ((ev: KeyboardEvent) => void) | undefined)?.(e)
        if (e.key === 'Enter') onOpen()
      }}
      className="flex cursor-grab flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="font-semibold">{task.title}</div>
      <div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className={overdue ? 'font-semibold text-red-700' : ''}>
          {task.deadline ? `Hạn ${new Date(task.deadline).toLocaleDateString('vi-VN')}` : 'Chưa có hạn'}
        </span>
        {task.reward_credits > 0 && <span className="font-semibold text-orange-900">+{task.reward_credits} Credits</span>}
        <span title={task.assignee?.full_name ?? 'Chưa gán người'} className="grid size-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
          {task.assignee ? task.assignee.full_name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase() : '?'}
        </span>
      </div>
    </div>
  )
}

function Column({ status, label, tasks, onOpen }: { status: Status; label: string; tasks: Task[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <section aria-label={label} className="flex min-w-64 flex-1 flex-col gap-2.5 rounded-xl bg-slate-200/70 p-3">
      <div className="flex justify-between text-sm font-semibold">
        <h2>{label}</h2>
        <span className="text-slate-600">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex min-h-24 flex-1 flex-col gap-2.5 rounded-lg ${isOver ? 'bg-slate-300/60' : ''}`}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <Card key={t.id} task={t} onOpen={() => onOpen(t.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && <p className="p-2 text-xs text-slate-600">Chưa có task. Kéo task vào đây.</p>}
      </div>
    </section>
  )
}

export function BoardPage() {
  const { id: projectId = '' } = useParams()
  const qc = useQueryClient()
  const key = ['tasks', projectId]
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => fetchProject(projectId) })
  const { data: tasks = [], isLoading } = useQuery({ queryKey: key, queryFn: () => fetchTasks(projectId) })
  const [dialog, setDialog] = useState<{ taskId: string | null } | null>(null)
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const byStatus = useMemo(() => {
    const g: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] }
    for (const t of tasks) g[t.status].push(t)
    for (const s of Object.keys(g) as Status[]) g[s].sort((a, b) => a.position - b.position)
    return g
  }, [tasks])

  const move = useMutation({
    mutationFn: (v: { id: string; status: Status; position: number }) => updateTask(v.id, { status: v.status, position: v.position }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (old) => old?.map((t) => (t.id === v.id ? { ...t, status: v.status, position: v.position } : t)))
      setError('')
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      setError('Không di chuyển được task. Thử lại.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['factory-progress'] })
    },
  })

  // Vị trí mới = trung bình vị trí 2 task hai bên (không cần đánh số lại cả cột)
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || over.id === active.id) return
    const dragged = tasks.find((t) => t.id === active.id)
    if (!dragged) return
    const overTask = tasks.find((t) => t.id === over.id)
    const status = (overTask ? overTask.status : String(over.id).replace('col:', '')) as Status
    const column = byStatus[status]
    const list = column.filter((t) => t.id !== dragged.id)
    let idx = list.length
    if (overTask) {
      idx = list.findIndex((t) => t.id === overTask.id)
      const movingDown = dragged.status === status && column.findIndex((t) => t.id === dragged.id) < column.findIndex((t) => t.id === overTask.id)
      if (movingDown) idx += 1
    }
    const prev = list[idx - 1]?.position
    const next = list[idx]?.position
    const position =
      prev !== undefined && next !== undefined ? (prev + next) / 2 : prev !== undefined ? prev + 1000 : next !== undefined ? next - 1000 : 1000
    if (status === dragged.status && position === dragged.position) return
    move.mutate({ id: dragged.id, status, position })
  }

  const openTask = dialog?.taskId ? tasks.find((t) => t.id === dialog.taskId) ?? null : null
  const nextPosition = Math.max(0, ...byStatus.todo.map((t) => t.position)) + 1000

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">{project?.name ?? 'Kanban'}</h1>
          {project?.description && <p className="mt-0.5 text-sm text-slate-600">{project.description}</p>}
        </div>
        <button onClick={() => setDialog({ taskId: null })} className="ml-auto min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white">
          + Thêm task
        </button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-600">Đang tải…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map((c) => (
              <Column key={c.status} status={c.status} label={c.label} tasks={byStatus[c.status]} onOpen={(id) => setDialog({ taskId: id })} />
            ))}
          </div>
        </DndContext>
      )}
      {dialog && (
        <TaskDialog
          key={dialog.taskId ?? 'new'}
          projectId={projectId}
          task={openTask}
          nextPosition={nextPosition}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
