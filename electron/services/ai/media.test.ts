import { describe, it, expect } from 'vitest'
import {
  extFromContentType,
  pickUrl,
  pickTaskId,
  pickStatus,
  base64UrlEncode,
  generateKlingJWT
} from './media'

describe('extFromContentType', () => {
  it('returns .png for png content type', () => {
    expect(extFromContentType('image/png', '.bin')).toBe('.png')
  })

  it('returns .jpg for jpeg content type', () => {
    expect(extFromContentType('image/jpeg', '.bin')).toBe('.jpg')
  })

  it('returns .jpg for jpg content type', () => {
    expect(extFromContentType('image/jpg', '.bin')).toBe('.jpg')
  })

  it('returns .webp for webp content type', () => {
    expect(extFromContentType('image/webp', '.bin')).toBe('.webp')
  })

  it('returns .mp4 for mp4 content type', () => {
    expect(extFromContentType('video/mp4', '.bin')).toBe('.mp4')
  })

  it('returns fallback for unknown content type', () => {
    expect(extFromContentType('application/octet-stream', '.dat')).toBe('.dat')
  })

  it('returns fallback for empty content type', () => {
    expect(extFromContentType('', '.bin')).toBe('.bin')
  })

  it('matches substrings (e.g. image/x-png)', () => {
    expect(extFromContentType('image/x-png', '.bin')).toBe('.png')
  })
})

describe('pickUrl', () => {
  it('picks url from data[0].url', () => {
    expect(pickUrl({ data: [{ url: 'https://example.com/a.png' }] })).toBe('https://example.com/a.png')
  })

  it('picks url from top-level .url', () => {
    expect(pickUrl({ url: 'https://example.com/b.png' })).toBe('https://example.com/b.png')
  })

  it('picks url from content.video_url', () => {
    expect(pickUrl({ content: { video_url: 'https://example.com/v.mp4' } })).toBe('https://example.com/v.mp4')
  })

  it('picks url from result.url', () => {
    expect(pickUrl({ result: { url: 'https://example.com/r.png' } })).toBe('https://example.com/r.png')
  })

  it('returns undefined when no url found', () => {
    expect(pickUrl({})).toBeUndefined()
    expect(pickUrl({ data: [] })).toBeUndefined()
    expect(pickUrl({ data: [{}] })).toBeUndefined()
  })

  it('prioritizes data[0].url over top-level url', () => {
    expect(pickUrl({
      data: [{ url: 'https://a.com' }],
      url: 'https://b.com'
    })).toBe('https://a.com')
  })
})

describe('pickTaskId', () => {
  it('picks id from top-level', () => {
    expect(pickTaskId({ id: 'task-1' })).toBe('task-1')
  })

  it('picks task_id from top-level', () => {
    expect(pickTaskId({ task_id: 'task-2' })).toBe('task-2')
  })

  it('picks id from nested data', () => {
    expect(pickTaskId({ data: { id: 'task-3' } })).toBe('task-3')
  })

  it('picks task_id from nested data', () => {
    expect(pickTaskId({ data: { task_id: 'task-4' } })).toBe('task-4')
  })

  it('returns undefined when no id found', () => {
    expect(pickTaskId({})).toBeUndefined()
  })

  it('prioritizes top-level id', () => {
    expect(pickTaskId({ id: 'top', data: { id: 'nested' } })).toBe('top')
  })
})

describe('pickStatus', () => {
  it('picks status from top-level', () => {
    expect(pickStatus({ status: 'succeeded' })).toBe('succeeded')
  })

  it('picks status from nested data', () => {
    expect(pickStatus({ data: { status: 'running' } })).toBe('running')
  })

  it('returns empty string when no status', () => {
    expect(pickStatus({})).toBe('')
  })

  it('converts non-string status to string', () => {
    expect(pickStatus({ status: 200 })).toBe('200')
  })
})

describe('base64UrlEncode', () => {
  it('encodes a string to base64url', () => {
    const result = base64UrlEncode('hello')
    expect(result).toBe('aGVsbG8')
    expect(result).not.toContain('=')
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
  })

  it('encodes a Buffer to base64url', () => {
    const buf = Buffer.from([0xff, 0xfe, 0xfd])
    const result = base64UrlEncode(buf)
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
    expect(result).not.toContain('=')
  })

  it('handles empty string', () => {
    expect(base64UrlEncode('')).toBe('')
  })

  it('correctly replaces + with - and / with _', () => {
    // Bytes that produce + and / in standard base64
    const buf = Buffer.from([0x3e, 0x3f]) // produces "Pj8=" in base64
    const result = base64UrlEncode(buf)
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
    expect(result).not.toContain('=')
  })
})

describe('generateKlingJWT', () => {
  it('generates a valid JWT structure', () => {
    const jwt = generateKlingJWT('access-key', 'secret-key')
    const parts = jwt.split('.')
    expect(parts).toHaveLength(3)
  })

  it('header contains HS256 algorithm', () => {
    const jwt = generateKlingJWT('ak', 'sk')
    const header = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64').toString())
    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')
  })

  it('payload contains issuer and timestamps', () => {
    const jwt = generateKlingJWT('my-access-key', 'my-secret')
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
    expect(payload.iss).toBe('my-access-key')
    expect(payload.iat).toBeTypeOf('number')
    expect(payload.exp).toBeTypeOf('number')
    expect(payload.exp - payload.iat).toBe(1800)
  })

  it('produces different signatures for different secrets', () => {
    const jwt1 = generateKlingJWT('ak', 'secret1')
    const jwt2 = generateKlingJWT('ak', 'secret2')
    const sig1 = jwt1.split('.')[2]
    const sig2 = jwt2.split('.')[2]
    expect(sig1).not.toBe(sig2)
  })
})
