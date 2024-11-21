# quartz-connect-iq-sdk

> [!Warning]
> This is still a work in progress. The usage will be simplified as the project becoming ready.

Convert the Connect IQ SDK documentations into a [quartz wiki](https://quartz.jzhao.xyz/).

# Usage

1. Get the SDK at [https://developer.garmin.com/connect-iq/overview/](Garmin's website). Put the documentations (in HTML) attached with the SDK under the directory `sdk-package` under the project root.
2. Run `node extract.js`. The output will be put into `out/`.
3. Symlink the static resources from the output directory: `cd out; ln -s ../resources; cd ..`.
4. Initialize quartz and preview the site: `cd quartz; npm i && npx quartz build --serve`.

# Notice
Please note that the documentation is part of the Garmin SDK and constitutes copyrighted material. You must ensure that this converter and its output is used under fair use (I think personal usage is fine).
