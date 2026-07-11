// Performance test script for AudioDN API calls
// Run with: node performance-test.js

const API_KEY = '4qnA1MHgSDwh2dp92oifv4cfHBYhdEXPxftuh1tpwkcLSPRSKAHpr8yZjP47ljsxnEHhWd'
const ID = '96e36d8f-8291-4583-8096-161be8b1010b'
const VARIANTS = ['hq', 'lq']

async function testCreatePlayerSession () {
  console.log('\n=== Testing createPlayerSession ===')
  const startTime = performance.now()

  try {
    const response = await fetch('https://api.audiodelivery.net/v1/play_session/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        collection_id: ID,
        variants: VARIANTS,
      }),
    })

    const data = await response.json()
    const endTime = performance.now()

    console.log(`✅ createPlayerSession: ${(endTime - startTime).toFixed(2)}ms`)
    console.log(`   Response size: ${JSON.stringify(data).length} characters`)
    console.log(`   Tracks count: ${data.tracks?.length || 0}`)

    return data
  } catch (error) {
    console.error('❌ createPlayerSession failed:', error.message)
    return null
  }
}

async function testGetPlaySession (playSessionId) {
  console.log('\n=== Testing getPlaySession ===')
  const startTime = performance.now()

  try {
    const response = await fetch(`https://api.audiodelivery.net/v1/play_session/${playSessionId}`)
    const data = await response.json()
    const endTime = performance.now()

    console.log(`✅ getPlaySession: ${(endTime - startTime).toFixed(2)}ms`)
    console.log(`   Response size: ${JSON.stringify(data).length} characters`)

    return data
  } catch (error) {
    console.error('❌ getPlaySession failed:', error.message)
    return null
  }
}

async function testGetPlaySessionTrack (playSessionId, trackId) {
  console.log('\n=== Testing getPlaySessionTrack ===')
  const startTime = performance.now()

  try {
    const response = await fetch(`https://api.audiodelivery.net/v1/play/${playSessionId}/${trackId}`)
    const data = await response.json()
    const endTime = performance.now()

    console.log(`✅ getPlaySessionTrack: ${(endTime - startTime).toFixed(2)}ms`)
    console.log(`   Response size: ${JSON.stringify(data).length} characters`)
    console.log(`   Variants count: ${data.variants?.length || 0}`)
    console.log(`   Levels count: ${data.levels?.levels?.length || 0}`)

    return data
  } catch (error) {
    console.error('❌ getPlaySessionTrack failed:', error.message)
    return null
  }
}

async function runPerformanceTest () {
  console.log('🚀 Starting AudioDN API Performance Test')
  console.log('=========================================')

  // Test 1: Create player session
  const sessionData = await testCreatePlayerSession()
  if (!sessionData) return

  const playSessionId = sessionData.play_session_id
  const firstTrackId = sessionData.tracks?.[0]?.id

  if (!playSessionId || !firstTrackId) {
    console.error('❌ Missing session or track data')
    return
  }

  // Test 2: Get existing session
  await testGetPlaySession(playSessionId)

  // Test 3: Get track details
  await testGetPlaySessionTrack(playSessionId, firstTrackId)

  console.log('\n✅ Performance test completed!')
}

// Run the test
runPerformanceTest().catch(console.error)
