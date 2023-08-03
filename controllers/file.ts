import { Request, Response } from 'express'
import { UploadedFile } from 'express-fileupload'

import { pngToWebp, bufferToBlob } from '../lib/image.js'
import {
  litIpfsEncrypt,
  litIpfsDecrypt,
  litConsentAuth,
} from '../lib/litProtocol.js'
import { accessLocalWallet, genAuthSig } from '../lib/thirdWeb.js'

import File from '../models/File.js'
import Consent from '../models/Consent.js'
import { nanoid } from 'nanoid'

import * as dotenv from 'dotenv'
dotenv.config()

export const filePost = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const file = req.files.file as UploadedFile
    const user = req.session['user']
    const userPass = req.session['password']

    const webpFile = await pngToWebp(file)
    const wallet = await accessLocalWallet(user.encWallet, userPass)
    const authSig = await genAuthSig(wallet)
    const webpBuffer = bufferToBlob(webpFile)
    const cid = await litIpfsEncrypt(webpBuffer, authSig)

    await File.create({
      cid: cid,
      owner: await wallet.getAddress(),
    })

    return res.status(200).send('OK')
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error.message)
  }
}

export const fileGet = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params
    const user = req.session['user']
    const userPass = req.session['password']

    const currFile = await File.findOne({ _id: id, isActive: true })
    const wallet = await accessLocalWallet(user.encWallet, userPass)
    const authSig = await genAuthSig(wallet)

    const test = await litConsentAuth(id, await wallet.getAddress(), authSig)

    console.log(test)
    return res.status(200).send('OK')

    const decryptedFileBuffer = Buffer.from(
      await litIpfsDecrypt(currFile.cid, authSig)
    )

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${nanoid()}.webp`
    )
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', decryptedFileBuffer.length)
    res.write(decryptedFileBuffer)
    res.end()
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error.message)
  }
}

// export const ipfsGetAll = async (req, res) => {
//   try {
//     const files = await File.find({ owner: req.user, isActive: true })
//     let buffers = []

//     if (files.length == 0) {
//       return sendReturn(400, 'No files uploaded yet', res)
//     }

//     for (const item of files) {
//       const fileBase64 = await ipfsStorageDownload(item.cid)
//       const encryptedBlob = LitJsSdk.base64StringToBlob(fileBase64)
//       const arrayKey = item.symmetricKey.split(',').map(Number)
//       const symmetricKey = new Uint8Array(arrayKey)

//       const decryptedFile = await LitJsSdk.decryptFile({
//         file: encryptedBlob,
//         symmetricKey: symmetricKey,
//       })

//       const decryptedFileBuffer = Buffer.from(decryptedFile)

//       buffers.push({
//         buffer: decryptedFileBuffer,
//         name: nanoid() + '.webp',
//       })
//     }

//     const archive = archiver('zip')
//     res.attachment('decrypted.zip')
//     archive.pipe(res)

//     buffers.forEach(({ buffer, name }) => {
//       archive.append(buffer, { name })
//     })

//     archive.finalize()
//   } catch (error) {
//     return sendReturn(500, error.message, res)
//   }
// }