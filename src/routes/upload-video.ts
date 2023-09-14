import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fastifyMultipart from '@fastify/multipart'
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util';

const pump = promisify(pipeline)


export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
       limits: {
            fileSize: 1_048_576 * 25 // 1mb * 25 =  25bm 
       } 
    })

    app.post('/videos', async (request, reply) => {
        const data = await request.file()

        if (!data) {
            return reply.status(400).send({error: 'Missing file input'})
        }

        const extension = path.extname(data.filename)
        console.log(extension)
        if (extension !== '.mp3') {
            return reply.status(400).send({error: 'File extension not supported, please upload .mp3'})
        }

        const fileBaseName = path.basename(data.filename, extension)
        console.log('fileBaseName', fileBaseName)

        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        console.log('fileUploadName', fileUploadName)

        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)
        console.log('uploadDestination', uploadDestination)
        
        await pump(data.file, fs.createWriteStream(uploadDestination))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination
            }
        })

        return {
            video
        }
    })
}