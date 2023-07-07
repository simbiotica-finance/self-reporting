import { toBufferBE } from 'bigint-buffer'

export default function responseToBytes (value, type) {
  switch (Number(type)) {
  case 0:
    return '0x' + toBufferBE(BigInt(value), 8).toString('hex')
  case 1:
    return '0x' + Buffer.from(value).toString('hex')
  default:
    return '0x' + Buffer.from(value).toString('hex')
  }
}
