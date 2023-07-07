import { ethers } from "ethers"

export default function parseResponse(value: string, type: number){
      switch (type) {
      case 0:
        return parseInt(value)
      case 1:
        return ethers.utils.parseBytes32String(value)
      default:
        return value
    }
    
}