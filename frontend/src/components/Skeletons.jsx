import { motion } from 'framer-motion'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'


export const CardSkeleton = ({ className = "" }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 animate-pulse ${className}`}>
    <div className="flex items-center mb-3">
      <Skeleton circle width={24} height={24} className="mr-2" />
      <Skeleton width={120} height={20} />
    </div>
    <Skeleton width="100%" height={16} className="mb-2" />
    <Skeleton width="75%" height={16} />
  </div>
)


export const DashboardSkeleton = () => (
  <div className="px-4 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <Skeleton width={250} height={32} className="mb-2" />
      <Skeleton width={350} height={20} className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <CardSkeleton className="mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  </div>
)


export const ChartSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton width={150} height={24} />
      <Skeleton width={32} height={32} circle />
    </div>
    <Skeleton width="100%" height={300} className="rounded-lg" />
  </div>
)


export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl shadow-md">
    <div className="px-6 py-4 border-b border-gray-200">
      <Skeleton width={200} height={24} />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton width={150} height={18} className="mb-1" />
              <Skeleton width={100} height={14} />
            </div>
            <Skeleton width={80} height={24} className="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
)


export const FormSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
    <div>
      <Skeleton width={100} height={16} className="mb-2" />
      <Skeleton width="100%" height={40} />
    </div>
    <div>
      <Skeleton width={120} height={16} className="mb-2" />
      <Skeleton width="100%" height={40} />
    </div>
    <div>
      <Skeleton width={80} height={16} className="mb-2" />
      <Skeleton width="100%" height={100} />
    </div>
    <div className="flex gap-3">
      <Skeleton width={100} height={40} />
      <Skeleton width={80} height={40} />
    </div>
  </div>
)