const fs = require('fs-extra');
const { join, sep } = require('path');
const gm = require('gm');
const marked = require('marked');
const chokidar = require('chokidar');

const ROOT_DIR = join(__dirname, '..');

function buildBlog() {
  const getDimensions = imagePath => {
    return new Promise((resolve, reject) => {
      gm(imagePath).size((err, value) => {
        if (value && value.width && value.height) {
          return resolve(value);
        } else {
          return reject(err || new Error('Invalid dimensions.'));
        }
      });
    });
  };


  const convertImage = (imagePath, outputPath, maxWidth) => {
    return new Promise((resolve, reject) => {
      (
        maxWidth
        ? gm(imagePath).resize(maxWidth)
        : gm(imagePath)
      )
        .interlace('Plane')
        .autoOrient()
        .write(outputPath, err => {
          if (err) return reject(err);
          else return resolve();
        });
    });
  };

  // fs+
  const removeDirRecursively = (dirPath, removeSelf = true) => {
    const files = fs.readdirSync(dirPath);
    for (let i = 0; i < files.length; i++) {
      const filePath = join(dirPath, files[i]);
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
      else removeDirRecursively(filePath);
    }
    if (removeSelf) fs.rmdirSync(dirPath);
  };

  const createDirIfNotExists = dirPath => {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
  };

  return Promise.resolve().then(() => {
    // reset build directory
    const distDir = join(ROOT_DIR, 'public/blog');
    createDirIfNotExists(distDir);
    removeDirRecursively(distDir, false);
    createDirIfNotExists(distDir);
    createDirIfNotExists(join(distDir, 'posts'));
    createDirIfNotExists(join(distDir, 'images'));
    createDirIfNotExists(join(distDir, 'assets'));

    // extract comments from source md
    const postsDir = fs.readdirSync(join(ROOT_DIR, 'blogSrc/posts'))
      .filter(name => (name.indexOf('.md') > 0))
      .sort((a, b) => (parseInt(a, 10) - parseInt(b, 10)));

    // generate posts.json
    const files = postsDir.map(filename => fs.readFileSync(join(ROOT_DIR, `blogSrc/posts/${filename}`), 'utf8'));

    const postsList = [];
    const localImages = {};

    const commentRegex = /<!-- post-.*?(?:-->)/g;
    const imageRegex = /<img [\s\S]*?>/g;
    const wordRegex = /\b\W+\b/;
    files.forEach((file, postId) => {
      const postComments = file.match(commentRegex);
      const postDetails = {};

      for (let i = 0; i < postComments.length; i++) {
        const trimmed = postComments[i].substring(10, postComments[i].length - 3).trim();
        const colonIndex = trimmed.indexOf(':');
        if (~colonIndex) {
          const k = trimmed.substring(0, colonIndex).trim();
          postDetails[k] = trimmed.substring(colonIndex + 1).trim();
          try {
            postDetails[k] = JSON.parse(postDetails[k]);
          } catch (e) {}
        } else {
          postDetails[trimmed] = true;
        }
      }

      if (postDetails.inactive) return;

      const postWords = file.split(wordRegex).length;

      const postMinutes = postDetails.minutes
        ? parseInt(postDetails.minutes, 10)
        : Math.max(1, Math.round(postWords / 225));

      const { title, timestamp, minutes, ...custom } = postDetails;

      const postHtml = marked(file);

      const postImages = {};

      (postHtml.match(imageRegex) || []).forEach(imageHtml => {
        const src = imageHtml.match(/ src="([^"]*)"/) || [];
        if (src[1] && !src[1].indexOf('images/')) {
          localImages[src[1]] = 1;
          postImages[src[1]] = 1;
        }
      });

      postsList.push({
        ...custom,
        title,
        timestamp,
        words: postWords,
        minutes: postMinutes,
        id: postId,
        html: postHtml,
        images: Object.keys(postImages)
      });
    })

    const postsJson = JSON.stringify(
      postsList.map(({ html, images, ...rest }) => rest)
    );

    // index json file
    fs.writeFileSync(join(distDir, 'posts/index.json'), postsJson);

    // index html file, embed index json
    fs.writeFileSync(
      join(distDir, 'index.html'),
      fs.readFileSync(join(ROOT_DIR, 'blogSrc/index.template.html'), 'utf8').replace('\/*[INJECT]*\/', postsJson)
    );

    return Promise.all(
      Object.keys(localImages)
        .map(localImagePath => {
          const fullPath = join(ROOT_DIR, `blogSrc/${localImagePath}`);
          const baseImageDir = join(distDir, 'images');
          const outputDir = join(distDir, localImagePath);

          // create any implied directories
          let backtrack = outputDir;
          let filename = '';
          while (backtrack !== baseImageDir) {
            if (backtrack !== outputDir) createDirIfNotExists(backtrack);
            const newBacktrack = backtrack.split(sep);
            const frag = newBacktrack.pop();
            if (backtrack === outputDir) filename = frag;
            backtrack = newBacktrack.join(sep);
          }

          let extension = filename.substring(filename.lastIndexOf('.'));
          const outputNoExt = outputDir.substring(0, outputDir.length - extension.length);

          // resize images
          const imageWidths = [];

          let resizes = [
            Promise.resolve(), // 360
            Promise.resolve(), // 540
            Promise.resolve(), // 800
            Promise.resolve(), // 1200
            Promise.resolve()  // original
          ];

          return getDimensions(fullPath)
            .then(({ width }) => {
              if (width > 360) {
                resizes[0] = convertImage(fullPath, `${outputNoExt}.360.jpg`, 360);
                imageWidths.push([360, `${localImagePath.substring(0, localImagePath.length - extension.length)}.360.jpg`]);
              }
              if (width > 540) {
                resizes[1] = convertImage(fullPath, `${outputNoExt}.540.jpg`, 540);
                imageWidths.push([540, `${localImagePath.substring(0, localImagePath.length - extension.length)}.540.jpg`]);
              }
              if (width > 800) {
                resizes[2] = convertImage(fullPath, `${outputNoExt}.800.jpg`, 800);
                imageWidths.push([800, `${localImagePath.substring(0, localImagePath.length - extension.length)}.800.jpg`]);
              }
              if (width > 1200) {
                resizes[3] = convertImage(fullPath, `${outputNoExt}.1200.jpg`, 1200);
                imageWidths.push([1200, `${localImagePath.substring(0, localImagePath.length - extension.length)}.1200.jpg`]);
              }
              resizes[4] = convertImage(fullPath, `${outputNoExt}.jpg`);
              imageWidths.push([width, `${localImagePath.substring(0, localImagePath.length - extension.length)}.jpg`]);

              return Promise.all(resizes)
                .then(() => {
                  localImages[localImagePath] = imageWidths.reduce((s, [w, p], i) => {
                    return `${s}${i ? ', ' : ''}${p} ${w}w`;
                  }, '');
                });
            });
        })
    ).then(() => {
      postsList.forEach(post => {
        // replace image html with sexy srcset magic
        post.images.forEach(imagePath => {
          post.html = post.html.replace(
            new RegExp(
              `<img src="${imagePath}"`.replace(
                /[-/\\^$*+?.()|[\]{}]/g,
                '\\$&'
              ),
              'g'
            ),
            `<img src="${localImages[imagePath].split(' ')[0]}" srcset="${localImages[imagePath]}" sizes="(max-width: 780px) 100vw, 680px" loading="lazy"`
          );
        });

        fs.writeFileSync(join(distDir, `posts/${post.id}.html`), post.html);
      });
    }).then(() =>
      fs.copy(
        join(ROOT_DIR, 'blogSrc/assets'),
        join(distDir, 'assets')
      )
    );
  });
}

module.exports = buildBlog;

if (require.main === module) {
  const watcher = chokidar.watch(
    join(__dirname, '../blogSrc'),
    {
      ignored: /^\./,
      persistent: true
    }
  );

  const startTime = Date.now() - 1000;
  let current = Promise.resolve();
  let queued = false;

  watcher.on('all', (event, path, stats) => {
    // ignore initial events
    if (!event.indexOf("add") && stats.mtime.getTime() < startTime) return;

    if (!queued) {
      queued = true;
      current.then(() => {
        queued = false;
        console.log("updating blog");
        current = buildBlog().then(() => console.log("finished update"));
      })
    }
  });
}
