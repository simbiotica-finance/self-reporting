async function getFromEvents(
    firstPromise: any,
    eventName: string
): Promise<any> {
   const tx = firstPromise
   const receipt = await tx.wait()
   const event = receipt.events?.find((e: any) => e.event === eventName)
   return event?.args
}

export default getFromEvents;
module.exports = getFromEvents;