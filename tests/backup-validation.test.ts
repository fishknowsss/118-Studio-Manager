import { describe, expect, it } from 'vitest'
import {
  BACKUP_COLLECTION_NAMES,
  BACKUP_SCHEMA_VERSION,
  buildBackupPayload,
  normalizeImportedBackup,
} from '../src/legacy/utils'

describe('backup validation', () => {
  it('rejects an incomplete backup created by the current schema', () => {
    const currentBackup = buildBackupPayload({
      projects: [{ id: 'project-1' }],
    }) as Record<string, unknown>
    delete currentBackup.shortDramaAssignments

    expect(() => normalizeImportedBackup(currentBackup)).toThrow('备份文件不完整')
  })

  it('rejects backups from a newer application schema', () => {
    const futureBackup = {
      ...buildBackupPayload({ projects: [{ id: 'project-1' }] }),
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
    }

    expect(() => normalizeImportedBackup(futureBackup)).toThrow('备份版本高于当前应用')
  })

  it('keeps supporting legacy backups that predate newer collections', () => {
    const legacyBackup = normalizeImportedBackup({
      schemaVersion: 2,
      exportedAt: '2026-04-12T10:00:00+08:00',
      projects: [{ id: 'project-1' }],
      tasks: [],
      people: [],
      logs: [],
      settings: [],
    })

    expect(legacyBackup.schemaVersion).toBe(2)
    for (const collection of BACKUP_COLLECTION_NAMES) {
      expect(Array.isArray(legacyBackup[collection])).toBe(true)
    }
  })

  it('rejects a legacy backup missing one of its core collections', () => {
    expect(() => normalizeImportedBackup({
      schemaVersion: 2,
      projects: [{ id: 'project-1' }],
      tasks: [],
      people: [],
      logs: [],
    })).toThrow('备份文件不完整')
  })

  it('rejects records that cannot be written to their IndexedDB store', () => {
    const invalid = buildBackupPayload({
      settings: [{ value: 'missing-key' }],
    })

    expect(() => normalizeImportedBackup(invalid)).toThrow('数据表记录无效')
  })

  it('rejects duplicate IndexedDB keys instead of silently overwriting records', () => {
    const invalid = buildBackupPayload({
      people: [
        { id: 'person-1', name: '甲' },
        { id: 'person-1', name: '乙' },
      ],
    })

    expect(() => normalizeImportedBackup(invalid)).toThrow('数据表存在重复记录')
  })

  it.each([
    ['people skills', { people: [{ id: 'person-1', skills: 42 }] }],
    ['task assignees', { tasks: [{ id: 'task-1', assigneeIds: {} }] }],
    ['short drama group members', { shortDramaGroups: [{ id: 'group-1', dramaId: 'drama-1', memberIds: {} }] }],
    ['short drama allocations', {
      shortDramaAssignments: [{
        id: 'assignment-1',
        dramaId: 'drama-1',
        producerIds: [],
        allocations: {},
      }],
    }],
  ])('rejects invalid array fields in %s records', (_label, partial) => {
    expect(() => normalizeImportedBackup(buildBackupPayload(partial))).toThrow('数据表记录无效')
  })

  it.each([
    [3, 6],
    [4, 7],
    [5, BACKUP_COLLECTION_NAMES.length],
  ])('requires the collections introduced by schema v%s', (schemaVersion, requiredCount) => {
    const backup = Object.fromEntries([
      ['schemaVersion', schemaVersion],
      ['exportedAt', '2026-07-13T10:00:00.000Z'],
      ...BACKUP_COLLECTION_NAMES.slice(0, requiredCount).map((name) => [name, []]),
    ])
    expect(() => normalizeImportedBackup(backup)).not.toThrow()

    delete backup[BACKUP_COLLECTION_NAMES[requiredCount - 1]]
    expect(() => normalizeImportedBackup(backup)).toThrow('备份文件不完整')
  })
})
