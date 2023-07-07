export default function parseResponse (value: any, type: any) {
  switch (Number(type)) {
  case 0:
    return parseInt(value.slice(2), 16)
  case 1:
    return Buffer.from(value.slice(2), 'hex').toString()
  default:
    return value
  }
}
